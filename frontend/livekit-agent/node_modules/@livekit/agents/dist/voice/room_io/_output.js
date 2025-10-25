import {
  AudioSource,
  LocalAudioTrack,
  RoomEvent,
  TrackPublishOptions,
  TrackSource
} from "@livekit/rtc-node";
import {
  ATTRIBUTE_TRANSCRIPTION_FINAL,
  ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID,
  ATTRIBUTE_TRANSCRIPTION_TRACK_ID,
  TOPIC_TRANSCRIPTION
} from "../../constants.js";
import { log } from "../../log.js";
import { Future, Task, shortuuid } from "../../utils.js";
import { AudioOutput, TextOutput } from "../io.js";
import { findMicrophoneTrackId } from "../transcription/index.js";
class BaseParticipantTranscriptionOutput extends TextOutput {
  room;
  isDeltaStream;
  participantIdentity = null;
  trackId;
  capturing = false;
  latestText = "";
  currentId = this.generateCurrentId();
  logger = log();
  constructor(room, isDeltaStream, participant) {
    super();
    this.room = room;
    this.isDeltaStream = isDeltaStream;
    this.room.on(RoomEvent.TrackPublished, this.onTrackPublished);
    this.room.on(RoomEvent.LocalTrackPublished, this.onLocalTrackPublished);
    this.setParticipant(participant);
  }
  setParticipant(participant) {
    if (typeof participant === "string" || participant === null) {
      this.participantIdentity = participant;
    } else {
      this.participantIdentity = participant.identity;
    }
    if (!this.participantIdentity) {
      return;
    }
    try {
      this.trackId = findMicrophoneTrackId(this.room, this.participantIdentity);
    } catch (error) {
    }
    this.flush();
    this.resetState();
  }
  onTrackPublished = (track, participant) => {
    if (!this.participantIdentity || participant.identity !== this.participantIdentity || track.source !== TrackSource.SOURCE_MICROPHONE) {
      return;
    }
    this.trackId = track.sid;
  };
  onLocalTrackPublished = (track) => {
    var _a;
    if (!this.participantIdentity || this.participantIdentity !== ((_a = this.room.localParticipant) == null ? void 0 : _a.identity) || track.source !== TrackSource.SOURCE_MICROPHONE) {
      return;
    }
    this.trackId = track.sid;
  };
  generateCurrentId() {
    return shortuuid("SG_");
  }
  resetState() {
    this.currentId = this.generateCurrentId();
    this.capturing = false;
    this.latestText = "";
  }
  async captureText(text) {
    if (!this.participantIdentity) {
      return;
    }
    this.latestText = text;
    await this.handleCaptureText(text);
  }
  flush() {
    if (!this.participantIdentity || !this.capturing) {
      return;
    }
    this.capturing = false;
    this.handleFlush();
  }
}
class ParticipantTranscriptionOutput extends BaseParticipantTranscriptionOutput {
  writer = null;
  flushTask = null;
  async handleCaptureText(text) {
    if (this.flushTask && !this.flushTask.done) {
      await this.flushTask.result;
    }
    if (!this.capturing) {
      this.resetState();
      this.capturing = true;
    }
    try {
      if (this.room.isConnected) {
        if (this.isDeltaStream) {
          if (this.writer === null) {
            this.writer = await this.createTextWriter();
          }
          await this.writer.write(text);
        } else {
          const tmpWriter = await this.createTextWriter();
          await tmpWriter.write(text);
          await tmpWriter.close();
        }
      }
    } catch (error) {
      this.logger.error(error, "failed to publish transcription");
    }
  }
  handleFlush() {
    const currWriter = this.writer;
    this.writer = null;
    this.flushTask = Task.from((controller) => this.flushTaskImpl(currWriter, controller.signal));
  }
  async createTextWriter(attributes) {
    if (!this.participantIdentity) {
      throw new Error("participantIdentity not found");
    }
    if (!this.room.localParticipant) {
      throw new Error("localParticipant not found");
    }
    if (!attributes) {
      attributes = {
        [ATTRIBUTE_TRANSCRIPTION_FINAL]: "false"
      };
      if (this.trackId) {
        attributes[ATTRIBUTE_TRANSCRIPTION_TRACK_ID] = this.trackId;
      }
    }
    attributes[ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID] = this.currentId;
    return await this.room.localParticipant.streamText({
      topic: TOPIC_TRANSCRIPTION,
      senderIdentity: this.participantIdentity,
      attributes
    });
  }
  async flushTaskImpl(writer, signal) {
    const attributes = {
      [ATTRIBUTE_TRANSCRIPTION_FINAL]: "true"
    };
    if (this.trackId) {
      attributes[ATTRIBUTE_TRANSCRIPTION_TRACK_ID] = this.trackId;
    }
    const abortPromise = new Promise((resolve) => {
      signal.addEventListener("abort", () => resolve());
    });
    try {
      if (this.room.isConnected) {
        if (this.isDeltaStream) {
          if (writer) {
            await Promise.race([writer.close(), abortPromise]);
          }
        } else {
          const tmpWriter = await Promise.race([this.createTextWriter(attributes), abortPromise]);
          if (signal.aborted || !tmpWriter) {
            return;
          }
          await Promise.race([tmpWriter.write(this.latestText), abortPromise]);
          if (signal.aborted) {
            return;
          }
          await Promise.race([tmpWriter.close(), abortPromise]);
        }
      }
    } catch (error) {
      this.logger.error(error, "failed to publish transcription");
    }
  }
}
class ParticipantLegacyTranscriptionOutput extends BaseParticipantTranscriptionOutput {
  pushedText = "";
  flushTask = null;
  async handleCaptureText(text) {
    if (!this.trackId) {
      return;
    }
    if (this.flushTask) {
      await this.flushTask;
    }
    if (!this.capturing) {
      this.resetState();
      this.capturing = true;
    }
    if (this.isDeltaStream) {
      this.pushedText += text;
    } else {
      this.pushedText = text;
    }
    await this.publishTranscription(this.currentId, this.pushedText, false);
  }
  handleFlush() {
    if (!this.trackId) {
      return;
    }
    this.flushTask = this.publishTranscription(this.currentId, this.pushedText, true);
    this.resetState();
  }
  async publishTranscription(id, text, final, signal) {
    var _a;
    if (!this.participantIdentity || !this.trackId) {
      return;
    }
    try {
      if (this.room.isConnected) {
        if (signal == null ? void 0 : signal.aborted) {
          return;
        }
        await ((_a = this.room.localParticipant) == null ? void 0 : _a.publishTranscription({
          participantIdentity: this.participantIdentity,
          trackSid: this.trackId,
          segments: [{ id, text, final, startTime: BigInt(0), endTime: BigInt(0), language: "" }]
        }));
      }
    } catch (error) {
      this.logger.error(error, "failed to publish transcription");
    }
  }
  resetState() {
    super.resetState();
    this.pushedText = "";
  }
}
class ParalellTextOutput extends TextOutput {
  /** @internal */
  _sinks;
  constructor(sinks, nextInChain) {
    super(nextInChain);
    this._sinks = sinks;
  }
  async captureText(text) {
    await Promise.all(this._sinks.map((sink) => sink.captureText(text)));
  }
  flush() {
    for (const sink of this._sinks) {
      sink.flush();
    }
  }
}
class ParticipantAudioOutput extends AudioOutput {
  room;
  options;
  audioSource;
  publication;
  flushTask;
  pushedDurationMs = 0;
  startedFuture = new Future();
  interruptedFuture = new Future();
  constructor(room, options) {
    super(options.sampleRate);
    this.room = room;
    this.options = options;
    this.audioSource = new AudioSource(options.sampleRate, options.numChannels);
  }
  get subscribed() {
    return this.startedFuture.done;
  }
  async start(signal) {
    await this.publishTrack(signal);
  }
  async captureFrame(frame) {
    await this.startedFuture.await;
    super.captureFrame(frame);
    this.pushedDurationMs += frame.samplesPerChannel / frame.sampleRate;
    await this.audioSource.captureFrame(frame);
  }
  async waitForPlayoutTask(abortController) {
    const abortFuture = new Future();
    const resolveAbort = () => {
      if (!abortFuture.done) abortFuture.resolve(true);
    };
    abortController.signal.addEventListener("abort", resolveAbort);
    this.audioSource.waitForPlayout().finally(() => {
      abortController.signal.removeEventListener("abort", resolveAbort);
      if (!abortFuture.done) abortFuture.resolve(false);
    });
    const interrupted = await Promise.race([
      abortFuture.await,
      this.interruptedFuture.await.then(() => true)
    ]);
    let pushedDuration = this.pushedDurationMs;
    if (interrupted) {
      pushedDuration = Math.max(this.pushedDurationMs - this.audioSource.queuedDuration, 0);
      this.audioSource.clearQueue();
    }
    this.pushedDurationMs = 0;
    this.interruptedFuture = new Future();
    this.onPlaybackFinished({
      playbackPosition: pushedDuration,
      interrupted
    });
  }
  /**
   * Flush any buffered audio, marking the current playback/segment as complete
   */
  flush() {
    super.flush();
    if (!this.pushedDurationMs) {
      return;
    }
    if (this.flushTask && !this.flushTask.done) {
      this.logger.error("flush called while playback is in progress");
      this.flushTask.cancel();
    }
    this.flushTask = Task.from((controller) => this.waitForPlayoutTask(controller));
  }
  clearBuffer() {
    if (!this.pushedDurationMs) {
      return;
    }
    this.interruptedFuture.resolve();
  }
  async publishTrack(signal) {
    var _a, _b;
    const track = LocalAudioTrack.createAudioTrack("roomio_audio", this.audioSource);
    this.publication = await ((_a = this.room.localParticipant) == null ? void 0 : _a.publishTrack(
      track,
      new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
    ));
    if (signal.aborted) {
      return;
    }
    await ((_b = this.publication) == null ? void 0 : _b.waitForSubscription());
    if (!this.startedFuture.done) {
      this.startedFuture.resolve();
    }
  }
  async close() {
    await this.audioSource.close();
  }
}
export {
  ParalellTextOutput,
  ParticipantAudioOutput,
  ParticipantLegacyTranscriptionOutput,
  ParticipantTranscriptionOutput
};
//# sourceMappingURL=_output.js.map