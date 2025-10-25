import {
  ConnectionState,
  DisconnectReason,
  ParticipantKind,
  RoomEvent,
  TrackPublishOptions,
  TrackSource
} from "@livekit/rtc-node";
import { ATTRIBUTE_PUBLISH_ON_BEHALF, TOPIC_CHAT } from "../../constants.js";
import { log } from "../../log.js";
import { IdentityTransform } from "../../stream/identity_transform.js";
import { Future, Task } from "../../utils.js";
import {} from "../agent_session.js";
import {
  AgentSessionEventTypes,
  CloseReason
} from "../events.js";
import { TranscriptionSynchronizer } from "../transcription/synchronizer.js";
import { ParticipantAudioInputStream } from "./_input.js";
import {
  ParalellTextOutput,
  ParticipantAudioOutput,
  ParticipantLegacyTranscriptionOutput,
  ParticipantTranscriptionOutput
} from "./_output.js";
const DEFAULT_TEXT_INPUT_CALLBACK = (sess, ev) => {
  sess.interrupt();
  sess.generateReply({ userInput: ev.text });
};
const DEFAULT_PARTICIPANT_KINDS = [
  ParticipantKind.SIP,
  ParticipantKind.STANDARD
];
const CLOSE_ON_DISCONNECT_REASONS = [
  DisconnectReason.CLIENT_INITIATED,
  DisconnectReason.ROOM_DELETED,
  DisconnectReason.USER_REJECTED
];
const DEFAULT_ROOM_INPUT_OPTIONS = {
  audioSampleRate: 24e3,
  audioNumChannels: 1,
  textEnabled: true,
  audioEnabled: true,
  videoEnabled: false,
  textInputCallback: DEFAULT_TEXT_INPUT_CALLBACK,
  closeOnDisconnect: true
};
const DEFAULT_ROOM_OUTPUT_OPTIONS = {
  audioSampleRate: 24e3,
  audioNumChannels: 1,
  transcriptionEnabled: true,
  audioEnabled: true,
  syncTranscription: true,
  audioPublishOptions: new TrackPublishOptions({ source: TrackSource.SOURCE_MICROPHONE })
};
class RoomIO {
  agentSession;
  room;
  inputOptions;
  outputOptions;
  audioInput;
  participantAudioOutput;
  userTranscriptOutput;
  agentTranscriptOutput;
  transcriptionSynchronizer;
  participantIdentity = null;
  participantAvailableFuture = new Future();
  roomConnectedFuture = new Future();
  // Use stream API for transcript queue
  userTranscriptStream = new IdentityTransform();
  userTranscriptWriter;
  forwardUserTranscriptTask;
  initTask;
  textStreamHandlerRegistered = false;
  logger = log();
  constructor({
    agentSession,
    room,
    participant = null,
    inputOptions,
    outputOptions
  }) {
    this.agentSession = agentSession;
    this.room = room;
    this.inputOptions = { ...DEFAULT_ROOM_INPUT_OPTIONS, ...inputOptions };
    this.outputOptions = { ...DEFAULT_ROOM_OUTPUT_OPTIONS, ...outputOptions };
    this.userTranscriptWriter = this.userTranscriptStream.writable.getWriter();
    this.participantIdentity = participant ? typeof participant === "string" ? participant : participant.identity : this.inputOptions.participantIdentity ?? null;
  }
  async init(signal) {
    var _a, _b;
    await this.roomConnectedFuture.await;
    for (const participant2 of this.room.remoteParticipants.values()) {
      this.onParticipantConnected(participant2);
    }
    if (signal.aborted) {
      return;
    }
    const participant = await this.participantAvailableFuture.await;
    this.setParticipant(participant.identity);
    this.updateTranscriptionOutput({
      output: this.agentTranscriptOutput,
      participant: ((_a = this.room.localParticipant) == null ? void 0 : _a.identity) ?? null
    });
    await ((_b = this.participantAudioOutput) == null ? void 0 : _b.start(signal));
  }
  onConnectionStateChanged = (state) => {
    this.logger.debug({ state }, "connection state changed");
    if (state === ConnectionState.CONN_CONNECTED && this.room.isConnected && !this.roomConnectedFuture.done) {
      this.roomConnectedFuture.resolve();
    }
  };
  onParticipantConnected = (participant) => {
    var _a, _b;
    if (this.participantAvailableFuture.done) {
      return;
    }
    if (this.participantIdentity) {
      if (participant.identity !== this.participantIdentity) {
        return;
      }
    } else if (
      // otherwise, skip participants that are marked as publishing for this agent
      ((_a = participant.attributes) == null ? void 0 : _a[ATTRIBUTE_PUBLISH_ON_BEHALF]) === ((_b = this.room.localParticipant) == null ? void 0 : _b.identity)
    ) {
      return;
    }
    const acceptedKinds = this.inputOptions.participantKinds ?? DEFAULT_PARTICIPANT_KINDS;
    if (participant.info.kind !== void 0 && !acceptedKinds.includes(participant.info.kind)) {
      return;
    }
    this.participantAvailableFuture.resolve(participant);
  };
  onParticipantDisconnected = (participant) => {
    if (participant.identity !== this.participantIdentity) {
      return;
    }
    this.participantAvailableFuture = new Future();
    if (this.inputOptions.closeOnDisconnect && participant.disconnectReason && CLOSE_ON_DISCONNECT_REASONS.includes(participant.disconnectReason)) {
      this.logger.info(
        {
          participant: participant.identity,
          reason: DisconnectReason[participant.disconnectReason]
        },
        "closing agent session due to participant disconnect (disable via `RoomInputOptions.closeOnDisconnect=False`)"
      );
      this.agentSession._closeSoon({
        reason: CloseReason.PARTICIPANT_DISCONNECTED
      });
    }
  };
  onUserInputTranscribed = (ev) => {
    this.userTranscriptWriter.write(ev).catch((error) => {
      this.logger.error({ error }, "Failed to write transcript event to stream");
    });
  };
  onAgentStateChanged = async (ev) => {
    if (this.room.isConnected && this.room.localParticipant) {
      await this.room.localParticipant.setAttributes({
        [`lk.agent.state`]: ev.newState
      });
    }
  };
  onUserTextInput = (reader, participantInfo) => {
    if (participantInfo.identity !== this.participantIdentity) {
      return;
    }
    const participant = this.room.remoteParticipants.get(participantInfo.identity);
    if (!participant) {
      this.logger.warn("participant not found, ignoring text input");
      return;
    }
    const readText = async () => {
      const text = await reader.readAll();
      const textInputResult = this.inputOptions.textInputCallback(this.agentSession, {
        text,
        info: reader.info,
        participant
      });
      if (textInputResult instanceof Promise) {
        await textInputResult;
      }
    };
    readText().catch((error) => {
      this.logger.error({ error }, "Error reading text input");
    });
  };
  async forwardUserTranscript(signal) {
    var _a, _b;
    const reader = this.userTranscriptStream.readable.getReader();
    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;
        const event = value;
        await ((_a = this.userTranscriptOutput) == null ? void 0 : _a.captureText(event.transcript));
        if (event.isFinal) {
          (_b = this.userTranscriptOutput) == null ? void 0 : _b.flush();
        }
      }
    } catch (error) {
      this.logger.error({ error }, "Error processing transcript stream");
    }
  }
  createTranscriptionOutput(options) {
    return new ParalellTextOutput([
      new ParticipantLegacyTranscriptionOutput(
        this.room,
        options.isDeltaStream,
        options.participant
      ),
      new ParticipantTranscriptionOutput(this.room, options.isDeltaStream, options.participant)
    ]);
  }
  updateTranscriptionOutput({
    output,
    participant
  }) {
    if (!output) {
      return;
    }
    for (const sink of output._sinks) {
      if (sink instanceof ParticipantLegacyTranscriptionOutput || sink instanceof ParticipantTranscriptionOutput) {
        sink.setParticipant(participant);
      }
    }
  }
  get audioOutput() {
    if (!this.transcriptionSynchronizer) {
      return this.participantAudioOutput;
    }
    return this.transcriptionSynchronizer.audioOutput;
  }
  get transcriptionOutput() {
    if (!this.transcriptionSynchronizer) {
      return this.agentTranscriptOutput;
    }
    return this.transcriptionSynchronizer.textOutput;
  }
  /** Switch to a different participant */
  setParticipant(participantIdentity) {
    var _a;
    this.logger.debug({ participantIdentity }, "setting participant");
    if (participantIdentity === null) {
      this.unsetParticipant();
      return;
    }
    if (this.participantIdentity !== participantIdentity) {
      this.participantAvailableFuture = new Future();
      for (const participant of this.room.remoteParticipants.values()) {
        if (participant.identity === participantIdentity) {
          this.participantAvailableFuture.resolve(participant);
          break;
        }
      }
    }
    this.participantIdentity = participantIdentity;
    (_a = this.audioInput) == null ? void 0 : _a.setParticipant(participantIdentity);
    this.updateTranscriptionOutput({
      output: this.userTranscriptOutput,
      participant: participantIdentity
    });
  }
  unsetParticipant() {
    var _a;
    this.participantIdentity = null;
    this.participantAvailableFuture = new Future();
    (_a = this.audioInput) == null ? void 0 : _a.setParticipant(null);
    this.updateTranscriptionOutput({
      output: this.userTranscriptOutput,
      participant: null
    });
  }
  start() {
    if (this.inputOptions.textEnabled) {
      try {
        this.room.registerTextStreamHandler(TOPIC_CHAT, this.onUserTextInput);
        this.textStreamHandlerRegistered = true;
      } catch (error) {
        if (this.inputOptions.textEnabled) {
          this.logger.warn(`text stream handler for topic "${TOPIC_CHAT}" already set, ignoring`);
        }
      }
    }
    if (this.inputOptions.audioEnabled) {
      this.audioInput = new ParticipantAudioInputStream({
        room: this.room,
        sampleRate: this.inputOptions.audioSampleRate,
        numChannels: this.inputOptions.audioNumChannels,
        noiseCancellation: this.inputOptions.noiseCancellation
      });
    }
    if (this.outputOptions.audioEnabled) {
      this.participantAudioOutput = new ParticipantAudioOutput(this.room, {
        sampleRate: this.outputOptions.audioSampleRate,
        numChannels: this.outputOptions.audioNumChannels,
        trackPublishOptions: this.outputOptions.audioPublishOptions
      });
    }
    if (this.outputOptions.transcriptionEnabled) {
      this.userTranscriptOutput = this.createTranscriptionOutput({
        isDeltaStream: false,
        participant: this.participantIdentity
      });
      this.forwardUserTranscriptTask = Task.from(
        (controller) => this.forwardUserTranscript(controller.signal)
      );
      this.agentTranscriptOutput = this.createTranscriptionOutput({
        isDeltaStream: true,
        participant: null
      });
      const audioOutput = this.participantAudioOutput;
      if (this.outputOptions.syncTranscription && audioOutput) {
        this.transcriptionSynchronizer = new TranscriptionSynchronizer(
          audioOutput,
          this.agentTranscriptOutput
        );
      }
    }
    this.room.on(RoomEvent.ParticipantConnected, this.onParticipantConnected);
    this.room.on(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    this.room.on(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    if (this.room.isConnected) {
      this.onConnectionStateChanged(ConnectionState.CONN_CONNECTED);
    }
    this.initTask = Task.from((controller) => this.init(controller.signal));
    if (this.audioInput) {
      this.agentSession.input.audio = this.audioInput;
    }
    if (this.audioOutput) {
      this.agentSession.output.audio = this.audioOutput;
    }
    if (this.transcriptionOutput) {
      this.agentSession.output.transcription = this.transcriptionOutput;
    }
    this.agentSession.on(AgentSessionEventTypes.AgentStateChanged, this.onAgentStateChanged);
    this.agentSession.on(AgentSessionEventTypes.UserInputTranscribed, this.onUserInputTranscribed);
  }
  async close() {
    var _a, _b, _c, _d, _e;
    this.room.off(RoomEvent.ParticipantConnected, this.onParticipantConnected);
    this.room.off(RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    this.room.off(RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    this.agentSession.off(AgentSessionEventTypes.UserInputTranscribed, this.onUserInputTranscribed);
    this.agentSession.off(AgentSessionEventTypes.AgentStateChanged, this.onAgentStateChanged);
    if (this.textStreamHandlerRegistered) {
      this.room.unregisterTextStreamHandler(TOPIC_CHAT);
      this.textStreamHandlerRegistered = false;
    }
    await ((_a = this.initTask) == null ? void 0 : _a.cancelAndWait());
    this.userTranscriptWriter.close();
    await ((_b = this.forwardUserTranscriptTask) == null ? void 0 : _b.cancelAndWait());
    await ((_c = this.audioInput) == null ? void 0 : _c.close());
    await ((_d = this.participantAudioOutput) == null ? void 0 : _d.close());
    await ((_e = this.transcriptionSynchronizer) == null ? void 0 : _e.close());
  }
}
export {
  RoomIO
};
//# sourceMappingURL=room_io.js.map