import { Mutex } from "@livekit/mutex";
import {
  RoomEvent
} from "@livekit/rtc-node";
import { log } from "../../log.js";
import {
  Future,
  Task,
  shortuuid,
  waitForParticipant,
  waitForTrackPublication
} from "../../utils.js";
import { AudioOutput } from "../io.js";
const RPC_CLEAR_BUFFER = "lk.clear_buffer";
const RPC_PLAYBACK_FINISHED = "lk.playback_finished";
const AUDIO_STREAM_TOPIC = "lk.audio_stream";
class DataStreamAudioOutput extends AudioOutput {
  static _playbackFinishedRpcRegistered = false;
  static _playbackFinishedHandlers = {};
  room;
  destinationIdentity;
  roomConnectedFuture;
  waitRemoteTrack;
  streamWriter;
  pushedDuration = 0;
  started = false;
  lock = new Mutex();
  startTask;
  #logger = log();
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
      this.startTask = Task.from(({ signal }) => this._start(signal));
    };
    this.roomConnectedFuture = new Future();
    this.room.on(RoomEvent.ConnectionStateChanged, (_) => {
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
      await waitForParticipant({
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
        await waitForTrackPublication({
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
      this.startTask = Task.from(({ signal }) => this._start(signal));
    }
    await this.startTask.result;
    await super.captureFrame(frame);
    if (!this.streamWriter) {
      this.streamWriter = await this.room.localParticipant.streamBytes({
        name: shortuuid("AUDIO_"),
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
        log().warn(
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
export {
  DataStreamAudioOutput
};
//# sourceMappingURL=datastream_io.js.map