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
var datastream_io_exports = {};
__export(datastream_io_exports, {
  DataStreamAudioOutput: () => DataStreamAudioOutput
});
module.exports = __toCommonJS(datastream_io_exports);
var import_mutex = require("@livekit/mutex");
var import_rtc_node = require("@livekit/rtc-node");
var import_log = require("../../log.cjs");
var import_utils = require("../../utils.cjs");
var import_io = require("../io.cjs");
const RPC_CLEAR_BUFFER = "lk.clear_buffer";
const RPC_PLAYBACK_FINISHED = "lk.playback_finished";
const AUDIO_STREAM_TOPIC = "lk.audio_stream";
class DataStreamAudioOutput extends import_io.AudioOutput {
  static _playbackFinishedRpcRegistered = false;
  static _playbackFinishedHandlers = {};
  room;
  destinationIdentity;
  roomConnectedFuture;
  waitRemoteTrack;
  streamWriter;
  pushedDuration = 0;
  started = false;
  lock = new import_mutex.Mutex();
  startTask;
  #logger = (0, import_log.log)();
  constructor(opts) {
    super(opts.sampleRate, void 0);
    const { room, destinationIdentity, sampleRate, waitRemoteTrack } = opts;
    this.room = room;
    this.destinationIdentity = destinationIdentity;
    this.sampleRate = sampleRate;
    this.waitRemoteTrack = waitRemoteTrack;
    const onRoomConnected = async () => {
      if (this.startTask) return;
      await this.roomConnectedFuture.await;
      DataStreamAudioOutput.registerPlaybackFinishedRpc({
        room,
        callerIdentity: this.destinationIdentity,
        handler: (data) => this.handlePlaybackFinished(data)
      });
      this.startTask = import_utils.Task.from(({ signal }) => this._start(signal));
    };
    this.roomConnectedFuture = new import_utils.Future();
    this.room.on(import_rtc_node.RoomEvent.ConnectionStateChanged, (_) => {
      if (room.isConnected && !this.roomConnectedFuture.done) {
        this.roomConnectedFuture.resolve(void 0);
      }
    });
    if (this.room.isConnected) {
      this.roomConnectedFuture.resolve(void 0);
    }
    onRoomConnected();
  }
  async _start(_abortSignal) {
    const unlock = await this.lock.lock();
    try {
      if (this.started) return;
      await this.roomConnectedFuture.await;
      this.#logger.debug(
        {
          identity: this.destinationIdentity
        },
        "waiting for the remote participant"
      );
      await (0, import_utils.waitForParticipant)({
        room: this.room,
        identity: this.destinationIdentity
      });
      if (this.waitRemoteTrack) {
        this.#logger.debug(
          {
            identity: this.destinationIdentity,
            kind: this.waitRemoteTrack
          },
          "waiting for the remote track"
        );
        await (0, import_utils.waitForTrackPublication)({
          room: this.room,
          identity: this.destinationIdentity,
          kind: this.waitRemoteTrack
        });
      }
      this.#logger.debug(
        {
          identity: this.destinationIdentity
        },
        "remote participant ready"
      );
      this.started = true;
    } finally {
      unlock();
    }
  }
  async captureFrame(frame) {
    if (!this.startTask) {
      this.startTask = import_utils.Task.from(({ signal }) => this._start(signal));
    }
    await this.startTask.result;
    await super.captureFrame(frame);
    if (!this.streamWriter) {
      this.streamWriter = await this.room.localParticipant.streamBytes({
        name: (0, import_utils.shortuuid)("AUDIO_"),
        topic: AUDIO_STREAM_TOPIC,
        destinationIdentities: [this.destinationIdentity],
        attributes: {
          sample_rate: frame.sampleRate.toString(),
          num_channels: frame.channels.toString()
        }
      });
      this.pushedDuration = 0;
    }
    await this.streamWriter.write(new Uint8Array(frame.data.buffer));
    this.pushedDuration += frame.samplesPerChannel / frame.sampleRate;
  }
  flush() {
    super.flush();
    if (this.streamWriter === void 0 || !this.started) {
      return;
    }
    this.streamWriter.close().finally(() => {
      this.streamWriter = void 0;
    });
  }
  clearBuffer() {
    if (!this.started) return;
    this.room.localParticipant.performRpc({
      destinationIdentity: this.destinationIdentity,
      method: RPC_CLEAR_BUFFER,
      payload: ""
    });
  }
  handlePlaybackFinished(data) {
    if (data.callerIdentity !== this.destinationIdentity) {
      this.#logger.warn(
        {
          callerIdentity: data.callerIdentity,
          destinationIdentity: this.destinationIdentity
        },
        "playback finished event received from unexpected participant"
      );
      return "reject";
    }
    this.#logger.info(
      {
        callerIdentity: data.callerIdentity
      },
      "playback finished event received"
    );
    const playbackFinishedEvent = JSON.parse(data.payload);
    this.onPlaybackFinished(playbackFinishedEvent);
    return "ok";
  }
  static registerPlaybackFinishedRpc({
    room,
    callerIdentity,
    handler
  }) {
    var _a;
    DataStreamAudioOutput._playbackFinishedHandlers[callerIdentity] = handler;
    if (DataStreamAudioOutput._playbackFinishedRpcRegistered) {
      return;
    }
    const rpcHandler = async (data) => {
      const handler2 = DataStreamAudioOutput._playbackFinishedHandlers[data.callerIdentity];
      if (!handler2) {
        (0, import_log.log)().warn(
          {
            callerIdentity: data.callerIdentity,
            expectedIdentities: Object.keys(DataStreamAudioOutput._playbackFinishedHandlers)
          },
          "playback finished event received from unexpected participant"
        );
        return "reject";
      }
      return handler2(data);
    };
    (_a = room.localParticipant) == null ? void 0 : _a.registerRpcMethod(RPC_PLAYBACK_FINISHED, rpcHandler);
    DataStreamAudioOutput._playbackFinishedRpcRegistered = true;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DataStreamAudioOutput
});
//# sourceMappingURL=datastream_io.cjs.map