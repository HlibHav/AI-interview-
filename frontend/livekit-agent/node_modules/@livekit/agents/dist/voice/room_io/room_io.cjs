"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var room_io_exports = {};
__export(room_io_exports, {
  RoomIO: () => RoomIO
});
module.exports = __toCommonJS(room_io_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_constants = require("../../constants.cjs");
var import_log = require("../../log.cjs");
var import_identity_transform = require("../../stream/identity_transform.cjs");
var import_utils = require("../../utils.cjs");
var import_agent_session = require("../agent_session.cjs");
var import_events = require("../events.cjs");
var import_synchronizer = require("../transcription/synchronizer.cjs");
var import_input = require("./_input.cjs");
var import_output = require("./_output.cjs");
const DEFAULT_TEXT_INPUT_CALLBACK = (sess, ev) => {
  sess.interrupt();
  sess.generateReply({ userInput: ev.text });
};
const DEFAULT_PARTICIPANT_KINDS = [
  import_rtc_node.ParticipantKind.SIP,
  import_rtc_node.ParticipantKind.STANDARD
];
const CLOSE_ON_DISCONNECT_REASONS = [
  import_rtc_node.DisconnectReason.CLIENT_INITIATED,
  import_rtc_node.DisconnectReason.ROOM_DELETED,
  import_rtc_node.DisconnectReason.USER_REJECTED
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
  audioPublishOptions: new import_rtc_node.TrackPublishOptions({ source: import_rtc_node.TrackSource.SOURCE_MICROPHONE })
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
  participantAvailableFuture = new import_utils.Future();
  roomConnectedFuture = new import_utils.Future();
  // Use stream API for transcript queue
  userTranscriptStream = new import_identity_transform.IdentityTransform();
  userTranscriptWriter;
  forwardUserTranscriptTask;
  initTask;
  textStreamHandlerRegistered = false;
  logger = (0, import_log.log)();
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
    if (state === import_rtc_node.ConnectionState.CONN_CONNECTED && this.room.isConnected && !this.roomConnectedFuture.done) {
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
      ((_a = participant.attributes) == null ? void 0 : _a[import_constants.ATTRIBUTE_PUBLISH_ON_BEHALF]) === ((_b = this.room.localParticipant) == null ? void 0 : _b.identity)
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
    this.participantAvailableFuture = new import_utils.Future();
    if (this.inputOptions.closeOnDisconnect && participant.disconnectReason && CLOSE_ON_DISCONNECT_REASONS.includes(participant.disconnectReason)) {
      this.logger.info(
        {
          participant: participant.identity,
          reason: import_rtc_node.DisconnectReason[participant.disconnectReason]
        },
        "closing agent session due to participant disconnect (disable via `RoomInputOptions.closeOnDisconnect=False`)"
      );
      this.agentSession._closeSoon({
        reason: import_events.CloseReason.PARTICIPANT_DISCONNECTED
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
    return new import_output.ParalellTextOutput([
      new import_output.ParticipantLegacyTranscriptionOutput(
        this.room,
        options.isDeltaStream,
        options.participant
      ),
      new import_output.ParticipantTranscriptionOutput(this.room, options.isDeltaStream, options.participant)
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
      if (sink instanceof import_output.ParticipantLegacyTranscriptionOutput || sink instanceof import_output.ParticipantTranscriptionOutput) {
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
      this.participantAvailableFuture = new import_utils.Future();
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
    this.participantAvailableFuture = new import_utils.Future();
    (_a = this.audioInput) == null ? void 0 : _a.setParticipant(null);
    this.updateTranscriptionOutput({
      output: this.userTranscriptOutput,
      participant: null
    });
  }
  start() {
    if (this.inputOptions.textEnabled) {
      try {
        this.room.registerTextStreamHandler(import_constants.TOPIC_CHAT, this.onUserTextInput);
        this.textStreamHandlerRegistered = true;
      } catch (error) {
        if (this.inputOptions.textEnabled) {
          this.logger.warn(`text stream handler for topic "${import_constants.TOPIC_CHAT}" already set, ignoring`);
        }
      }
    }
    if (this.inputOptions.audioEnabled) {
      this.audioInput = new import_input.ParticipantAudioInputStream({
        room: this.room,
        sampleRate: this.inputOptions.audioSampleRate,
        numChannels: this.inputOptions.audioNumChannels,
        noiseCancellation: this.inputOptions.noiseCancellation
      });
    }
    if (this.outputOptions.audioEnabled) {
      this.participantAudioOutput = new import_output.ParticipantAudioOutput(this.room, {
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
      this.forwardUserTranscriptTask = import_utils.Task.from(
        (controller) => this.forwardUserTranscript(controller.signal)
      );
      this.agentTranscriptOutput = this.createTranscriptionOutput({
        isDeltaStream: true,
        participant: null
      });
      const audioOutput = this.participantAudioOutput;
      if (this.outputOptions.syncTranscription && audioOutput) {
        this.transcriptionSynchronizer = new import_synchronizer.TranscriptionSynchronizer(
          audioOutput,
          this.agentTranscriptOutput
        );
      }
    }
    this.room.on(import_rtc_node.RoomEvent.ParticipantConnected, this.onParticipantConnected);
    this.room.on(import_rtc_node.RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    this.room.on(import_rtc_node.RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    if (this.room.isConnected) {
      this.onConnectionStateChanged(import_rtc_node.ConnectionState.CONN_CONNECTED);
    }
    this.initTask = import_utils.Task.from((controller) => this.init(controller.signal));
    if (this.audioInput) {
      this.agentSession.input.audio = this.audioInput;
    }
    if (this.audioOutput) {
      this.agentSession.output.audio = this.audioOutput;
    }
    if (this.transcriptionOutput) {
      this.agentSession.output.transcription = this.transcriptionOutput;
    }
    this.agentSession.on(import_events.AgentSessionEventTypes.AgentStateChanged, this.onAgentStateChanged);
    this.agentSession.on(import_events.AgentSessionEventTypes.UserInputTranscribed, this.onUserInputTranscribed);
  }
  async close() {
    var _a, _b, _c, _d, _e;
    this.room.off(import_rtc_node.RoomEvent.ParticipantConnected, this.onParticipantConnected);
    this.room.off(import_rtc_node.RoomEvent.ConnectionStateChanged, this.onConnectionStateChanged);
    this.room.off(import_rtc_node.RoomEvent.ParticipantDisconnected, this.onParticipantDisconnected);
    this.agentSession.off(import_events.AgentSessionEventTypes.UserInputTranscribed, this.onUserInputTranscribed);
    this.agentSession.off(import_events.AgentSessionEventTypes.AgentStateChanged, this.onAgentStateChanged);
    if (this.textStreamHandlerRegistered) {
      this.room.unregisterTextStreamHandler(import_constants.TOPIC_CHAT);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RoomIO
});
//# sourceMappingURL=room_io.cjs.map