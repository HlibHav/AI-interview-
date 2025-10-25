import { FfiClient, FfiHandle } from "./ffi_client.js";
import { CreateAudioTrackRequest, CreateVideoTrackRequest } from "./proto/track_pb.js";
class Track {
  constructor(owned) {
    this.info = owned.info;
    this.ffi_handle = new FfiHandle(owned.handle.id);
  }
  get sid() {
    var _a;
    return (_a = this.info) == null ? void 0 : _a.sid;
  }
  get name() {
    var _a;
    return (_a = this.info) == null ? void 0 : _a.name;
  }
  get kind() {
    var _a;
    return (_a = this.info) == null ? void 0 : _a.kind;
  }
  get stream_state() {
    var _a;
    return (_a = this.info) == null ? void 0 : _a.streamState;
  }
  get muted() {
    var _a;
    return (_a = this.info) == null ? void 0 : _a.muted;
  }
  async close() {
    this.ffi_handle.dispose();
  }
}
class LocalAudioTrack extends Track {
  constructor(owned, source) {
    super(owned);
    this.source = source;
  }
  static createAudioTrack(name, source) {
    const req = new CreateAudioTrackRequest({
      name,
      sourceHandle: source.ffiHandle.handle
    });
    const res = FfiClient.instance.request({
      message: { case: "createAudioTrack", value: req }
    });
    return new LocalAudioTrack(res.track, source);
  }
  async close(closeSource = true) {
    var _a;
    await super.close();
    if (closeSource) {
      await ((_a = this.source) == null ? void 0 : _a.close());
    }
  }
}
class LocalVideoTrack extends Track {
  constructor(owned, source) {
    super(owned);
    this.source = source;
  }
  static createVideoTrack(name, source) {
    const req = new CreateVideoTrackRequest({
      name,
      sourceHandle: source.ffiHandle.handle
    });
    const res = FfiClient.instance.request({
      message: { case: "createVideoTrack", value: req }
    });
    return new LocalVideoTrack(res.track, source);
  }
  async close(closeSource = true) {
    var _a;
    await super.close();
    if (closeSource) {
      await ((_a = this.source) == null ? void 0 : _a.close());
    }
  }
}
class RemoteVideoTrack extends Track {
  constructor(owned) {
    super(owned);
  }
}
class RemoteAudioTrack extends Track {
  constructor(owned) {
    super(owned);
  }
}
export {
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteVideoTrack,
  Track
};
//# sourceMappingURL=track.js.map