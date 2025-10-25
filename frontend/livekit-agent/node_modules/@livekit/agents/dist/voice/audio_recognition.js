import { AudioFrame } from "@livekit/rtc-node";
import { ReadableStream } from "node:stream/web";
import {} from "../llm/chat_context.js";
import { log } from "../log.js";
import { DeferredReadableStream, isStreamReaderReleaseError } from "../stream/deferred_stream.js";
import { IdentityTransform } from "../stream/identity_transform.js";
import { mergeReadableStreams } from "../stream/merge_readable_streams.js";
import { SpeechEventType } from "../stt/stt.js";
import { Task, delay } from "../utils.js";
import { VADEventType } from "../vad.js";
class AudioRecognition {
  hooks;
  stt;
  vad;
  turnDetector;
  turnDetectionMode;
  minEndpointingDelay;
  maxEndpointingDelay;
  lastLanguage;
  deferredInputStream;
  logger = log();
  lastFinalTranscriptTime = 0;
  audioTranscript = "";
  audioInterimTranscript = "";
  lastSpeakingTime = 0;
  userTurnCommitted = false;
  speaking = false;
  sampleRate;
  vadInputStream;
  sttInputStream;
  silenceAudioTransform = new IdentityTransform();
  silenceAudioWriter;
  // all cancellable tasks
  bounceEOUTask;
  commitUserTurnTask;
  vadTask;
  sttTask;
  constructor(opts) {
    this.hooks = opts.recognitionHooks;
    this.stt = opts.stt;
    this.vad = opts.vad;
    this.turnDetector = opts.turnDetector;
    this.turnDetectionMode = opts.turnDetectionMode;
    this.minEndpointingDelay = opts.minEndpointingDelay;
    this.maxEndpointingDelay = opts.maxEndpointingDelay;
    this.lastLanguage = void 0;
    this.deferredInputStream = new DeferredReadableStream();
    const [vadInputStream, sttInputStream] = this.deferredInputStream.stream.tee();
    this.vadInputStream = vadInputStream;
    this.sttInputStream = mergeReadableStreams(sttInputStream, this.silenceAudioTransform.readable);
    this.silenceAudioWriter = this.silenceAudioTransform.writable.getWriter();
  }
  /**
   * Current transcript of the user's speech, including interim transcript if available.
   */
  get currentTranscript() {
    if (this.audioInterimTranscript) {
      return `${this.audioTranscript} ${this.audioInterimTranscript}`.trim();
    }
    return this.audioTranscript;
  }
  async start() {
    this.vadTask = Task.from(({ signal }) => this.createVadTask(this.vad, signal));
    this.vadTask.result.catch((err) => {
      this.logger.error(`Error running VAD task: ${err}`);
    });
    this.sttTask = Task.from(({ signal }) => this.createSttTask(this.stt, signal));
    this.sttTask.result.catch((err) => {
      this.logger.error(`Error running STT task: ${err}`);
    });
  }
  async onSTTEvent(ev) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    if (this.turnDetectionMode === "manual" && this.userTurnCommitted && (this.bounceEOUTask === void 0 || this.bounceEOUTask.done || ev.type == SpeechEventType.INTERIM_TRANSCRIPT)) {
      this.logger.debug(
        {
          userTurnCommitted: this.userTurnCommitted,
          eouTaskDone: (_a = this.bounceEOUTask) == null ? void 0 : _a.done,
          evType: ev.type,
          turnDetectionMode: this.turnDetectionMode
        },
        "ignoring stt event"
      );
      return;
    }
    switch (ev.type) {
      case SpeechEventType.FINAL_TRANSCRIPT:
        this.hooks.onFinalTranscript(ev);
        const transcript = (_c = (_b = ev.alternatives) == null ? void 0 : _b[0]) == null ? void 0 : _c.text;
        this.lastLanguage = (_e = (_d = ev.alternatives) == null ? void 0 : _d[0]) == null ? void 0 : _e.language;
        if (!transcript) {
          return;
        }
        this.logger.debug(
          {
            user_transcript: transcript,
            language: this.lastLanguage
          },
          "received user transcript"
        );
        this.lastFinalTranscriptTime = Date.now();
        this.audioTranscript += ` ${transcript}`;
        this.audioTranscript = this.audioTranscript.trimStart();
        this.audioInterimTranscript = "";
        if (!this.speaking) {
          if (!this.vad) {
            this.lastSpeakingTime = Date.now();
          }
          if (this.vadBaseTurnDetection || this.userTurnCommitted) {
            const chatCtx = this.hooks.retrieveChatCtx();
            this.logger.debug("running EOU detection on stt FINAL_TRANSCRIPT");
            this.runEOUDetection(chatCtx);
          }
        }
        break;
      case SpeechEventType.INTERIM_TRANSCRIPT:
        this.logger.debug({ transcript: (_g = (_f = ev.alternatives) == null ? void 0 : _f[0]) == null ? void 0 : _g.text }, "interim transcript");
        this.hooks.onInterimTranscript(ev);
        this.audioInterimTranscript = ((_i = (_h = ev.alternatives) == null ? void 0 : _h[0]) == null ? void 0 : _i.text) ?? "";
        break;
      case SpeechEventType.END_OF_SPEECH:
        if (this.turnDetectionMode !== "stt") break;
        this.userTurnCommitted = true;
        if (!this.speaking) {
          const chatCtx = this.hooks.retrieveChatCtx();
          this.logger.debug("running EOU detection on stt END_OF_SPEECH");
          this.runEOUDetection(chatCtx);
        }
    }
  }
  runEOUDetection(chatCtx) {
    var _a;
    this.logger.debug(
      {
        stt: this.stt,
        audioTranscript: this.audioTranscript,
        turnDetectionMode: this.turnDetectionMode
      },
      "running EOU detection"
    );
    if (this.stt && !this.audioTranscript && this.turnDetectionMode !== "manual") {
      this.logger.debug("skipping EOU detection");
      return;
    }
    chatCtx = chatCtx.copy();
    chatCtx.addMessage({ role: "user", content: this.audioTranscript });
    const turnDetector = (
      // disable EOU model if manual turn detection enabled
      this.audioTranscript && this.turnDetectionMode !== "manual" ? this.turnDetector : void 0
    );
    const bounceEOUTask = (lastSpeakingTime) => async (controller) => {
      let endpointingDelay = this.minEndpointingDelay;
      if (turnDetector) {
        this.logger.debug("Running turn detector model");
        if (!turnDetector.supportsLanguage(this.lastLanguage)) {
          this.logger.debug(`Turn detector does not support language ${this.lastLanguage}`);
        } else {
          const endOfTurnProbability = await turnDetector.predictEndOfTurn(chatCtx);
          this.logger.debug(
            { endOfTurnProbability, language: this.lastLanguage },
            "end of turn probability"
          );
          const unlikelyThreshold = await turnDetector.unlikelyThreshold(this.lastLanguage);
          this.logger.debug(
            {
              unlikelyThreshold,
              endOfTurnProbability,
              language: this.lastLanguage,
              transcript: this.audioTranscript
            },
            "EOU Detection"
          );
          if (unlikelyThreshold && endOfTurnProbability < unlikelyThreshold) {
            endpointingDelay = this.maxEndpointingDelay;
          }
        }
      }
      const extraSleep = lastSpeakingTime + endpointingDelay - Date.now();
      await delay(Math.max(extraSleep, 0), { signal: controller.signal });
      this.logger.debug({ transcript: this.audioTranscript }, "end of user turn");
      const committed = await this.hooks.onEndOfTurn({
        newTranscript: this.audioTranscript,
        transcriptionDelay: Math.max(this.lastFinalTranscriptTime - lastSpeakingTime, 0),
        endOfUtteranceDelay: Date.now() - lastSpeakingTime
      });
      if (committed) {
        this.audioTranscript = "";
      }
      this.userTurnCommitted = false;
    };
    (_a = this.bounceEOUTask) == null ? void 0 : _a.cancel();
    this.bounceEOUTask = Task.from(bounceEOUTask(this.lastSpeakingTime));
    this.bounceEOUTask.result.then(() => {
      this.logger.debug("EOU detection task completed");
    }).catch((err) => {
      if (err instanceof Error && err.message.includes("This operation was aborted")) {
        return;
      }
      this.logger.error(err, "Error in EOU detection task:");
    });
  }
  async createSttTask(stt, signal) {
    if (!stt) return;
    this.logger.debug("createSttTask: create stt stream from stt node");
    const sttStream = await stt(this.sttInputStream, {});
    if (signal.aborted || sttStream === null) return;
    if (sttStream instanceof ReadableStream) {
      const reader = sttStream.getReader();
      signal.addEventListener("abort", async () => {
        try {
          reader.releaseLock();
          await (sttStream == null ? void 0 : sttStream.cancel());
        } catch (e) {
          this.logger.debug("createSttTask: error during abort handler:", e);
        }
      });
      try {
        while (true) {
          if (signal.aborted) break;
          const { done, value: ev } = await reader.read();
          if (done) break;
          if (typeof ev === "string") {
            throw new Error("STT node must yield SpeechEvent");
          } else {
            await this.onSTTEvent(ev);
          }
        }
      } catch (e) {
        if (isStreamReaderReleaseError(e)) {
          return;
        }
        this.logger.error({ error: e }, "createSttTask: error reading sttStream");
      } finally {
        reader.releaseLock();
        try {
          await sttStream.cancel();
        } catch (e) {
          this.logger.debug(
            "createSttTask: error cancelling sttStream (may already be cancelled):",
            e
          );
        }
      }
    }
  }
  async createVadTask(vad, signal) {
    var _a;
    if (!vad) return;
    const vadStream = vad.stream();
    vadStream.updateInputStream(this.vadInputStream);
    const abortHandler = () => {
      vadStream.detachInputStream();
      vadStream.close();
      signal.removeEventListener("abort", abortHandler);
    };
    signal.addEventListener("abort", abortHandler);
    try {
      for await (const ev of vadStream) {
        if (signal.aborted) break;
        switch (ev.type) {
          case VADEventType.START_OF_SPEECH:
            this.logger.debug("VAD task: START_OF_SPEECH");
            this.hooks.onStartOfSpeech(ev);
            this.speaking = true;
            if (ev.frames.length > 0 && ev.frames[0]) {
              this.sampleRate = ev.frames[0].sampleRate;
            }
            (_a = this.bounceEOUTask) == null ? void 0 : _a.cancel();
            break;
          case VADEventType.INFERENCE_DONE:
            this.hooks.onVADInferenceDone(ev);
            break;
          case VADEventType.END_OF_SPEECH:
            this.logger.debug("VAD task: END_OF_SPEECH");
            this.hooks.onEndOfSpeech(ev);
            this.speaking = false;
            this.lastSpeakingTime = Date.now() - ev.silenceDuration;
            if (this.vadBaseTurnDetection || this.turnDetectionMode === "stt" && this.userTurnCommitted) {
              const chatCtx = this.hooks.retrieveChatCtx();
              this.runEOUDetection(chatCtx);
            }
            break;
        }
      }
    } catch (e) {
      this.logger.error(e, "Error in VAD task");
    } finally {
      this.logger.debug("VAD task closed");
    }
  }
  setInputAudioStream(audioStream) {
    this.deferredInputStream.setSource(audioStream);
  }
  detachInputAudioStream() {
    this.deferredInputStream.detachSource();
  }
  clearUserTurn() {
    var _a;
    this.audioTranscript = "";
    this.audioInterimTranscript = "";
    this.userTurnCommitted = false;
    (_a = this.sttTask) == null ? void 0 : _a.cancelAndWait().finally(() => {
      this.sttTask = Task.from(({ signal }) => this.createSttTask(this.stt, signal));
      this.sttTask.result.catch((err) => {
        this.logger.error(`Error running STT task: ${err}`);
      });
    });
  }
  commitUserTurn(audioDetached) {
    var _a;
    const commitUserTurnTask = (delayDuration = 500) => async (controller) => {
      if (Date.now() - this.lastFinalTranscriptTime > delayDuration) {
        if (audioDetached && this.sampleRate !== void 0) {
          const numSamples = Math.floor(this.sampleRate * 0.5);
          const silence = new Int16Array(numSamples * 2);
          const silenceFrame = new AudioFrame(silence, this.sampleRate, 1, numSamples);
          this.silenceAudioWriter.write(silenceFrame);
        }
        await delay(delayDuration, { signal: controller.signal });
      }
      if (this.audioInterimTranscript) {
        this.audioTranscript = `${this.audioTranscript} ${this.audioInterimTranscript}`.trim();
      }
      this.audioInterimTranscript = "";
      const chatCtx = this.hooks.retrieveChatCtx();
      this.logger.debug("running EOU detection on commitUserTurn");
      this.runEOUDetection(chatCtx);
      this.userTurnCommitted = true;
    };
    (_a = this.commitUserTurnTask) == null ? void 0 : _a.cancel();
    this.commitUserTurnTask = Task.from(commitUserTurnTask());
    this.commitUserTurnTask.result.then(() => {
      this.logger.debug("User turn committed");
    }).catch((err) => {
      this.logger.error(err, "Error in user turn commit task:");
    });
  }
  async close() {
    var _a, _b, _c, _d;
    this.detachInputAudioStream();
    await ((_a = this.commitUserTurnTask) == null ? void 0 : _a.cancelAndWait());
    await ((_b = this.sttTask) == null ? void 0 : _b.cancelAndWait());
    await ((_c = this.vadTask) == null ? void 0 : _c.cancelAndWait());
    await ((_d = this.bounceEOUTask) == null ? void 0 : _d.cancelAndWait());
  }
  get vadBaseTurnDetection() {
    return ["vad", void 0].includes(this.turnDetectionMode);
  }
}
export {
  AudioRecognition
};
//# sourceMappingURL=audio_recognition.js.map