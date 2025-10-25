import { Message, proto2 } from "@bufbuild/protobuf";
import { FfiOwnedHandle } from "./handle_pb.js";
const _OwnedTextStreamReader = class _OwnedTextStreamReader extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _OwnedTextStreamReader().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _OwnedTextStreamReader().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _OwnedTextStreamReader().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_OwnedTextStreamReader, a, b);
  }
};
_OwnedTextStreamReader.runtime = proto2;
_OwnedTextStreamReader.typeName = "livekit.proto.OwnedTextStreamReader";
_OwnedTextStreamReader.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "handle", kind: "message", T: FfiOwnedHandle, req: true },
  { no: 2, name: "info", kind: "message", T: TextStreamInfo, req: true }
]);
let OwnedTextStreamReader = _OwnedTextStreamReader;
const _TextStreamReaderReadIncrementalRequest = class _TextStreamReaderReadIncrementalRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderReadIncrementalRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderReadIncrementalRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderReadIncrementalRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderReadIncrementalRequest, a, b);
  }
};
_TextStreamReaderReadIncrementalRequest.runtime = proto2;
_TextStreamReaderReadIncrementalRequest.typeName = "livekit.proto.TextStreamReaderReadIncrementalRequest";
_TextStreamReaderReadIncrementalRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true }
]);
let TextStreamReaderReadIncrementalRequest = _TextStreamReaderReadIncrementalRequest;
const _TextStreamReaderReadIncrementalResponse = class _TextStreamReaderReadIncrementalResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderReadIncrementalResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderReadIncrementalResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderReadIncrementalResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderReadIncrementalResponse, a, b);
  }
};
_TextStreamReaderReadIncrementalResponse.runtime = proto2;
_TextStreamReaderReadIncrementalResponse.typeName = "livekit.proto.TextStreamReaderReadIncrementalResponse";
_TextStreamReaderReadIncrementalResponse.fields = proto2.util.newFieldList(() => []);
let TextStreamReaderReadIncrementalResponse = _TextStreamReaderReadIncrementalResponse;
const _TextStreamReaderReadAllRequest = class _TextStreamReaderReadAllRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderReadAllRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderReadAllRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderReadAllRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderReadAllRequest, a, b);
  }
};
_TextStreamReaderReadAllRequest.runtime = proto2;
_TextStreamReaderReadAllRequest.typeName = "livekit.proto.TextStreamReaderReadAllRequest";
_TextStreamReaderReadAllRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true }
]);
let TextStreamReaderReadAllRequest = _TextStreamReaderReadAllRequest;
const _TextStreamReaderReadAllResponse = class _TextStreamReaderReadAllResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderReadAllResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderReadAllResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderReadAllResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderReadAllResponse, a, b);
  }
};
_TextStreamReaderReadAllResponse.runtime = proto2;
_TextStreamReaderReadAllResponse.typeName = "livekit.proto.TextStreamReaderReadAllResponse";
_TextStreamReaderReadAllResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let TextStreamReaderReadAllResponse = _TextStreamReaderReadAllResponse;
const _TextStreamReaderReadAllCallback = class _TextStreamReaderReadAllCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.TextStreamReaderReadAllCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderReadAllCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderReadAllCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderReadAllCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderReadAllCallback, a, b);
  }
};
_TextStreamReaderReadAllCallback.runtime = proto2;
_TextStreamReaderReadAllCallback.typeName = "livekit.proto.TextStreamReaderReadAllCallback";
_TextStreamReaderReadAllCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "content", kind: "scalar", T: 9, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let TextStreamReaderReadAllCallback = _TextStreamReaderReadAllCallback;
const _TextStreamReaderEvent = class _TextStreamReaderEvent extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.TextStreamReaderEvent.detail
     */
    this.detail = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderEvent().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderEvent().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderEvent().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderEvent, a, b);
  }
};
_TextStreamReaderEvent.runtime = proto2;
_TextStreamReaderEvent.typeName = "livekit.proto.TextStreamReaderEvent";
_TextStreamReaderEvent.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "chunk_received", kind: "message", T: TextStreamReaderChunkReceived, oneof: "detail" },
  { no: 3, name: "eos", kind: "message", T: TextStreamReaderEOS, oneof: "detail" }
]);
let TextStreamReaderEvent = _TextStreamReaderEvent;
const _TextStreamReaderChunkReceived = class _TextStreamReaderChunkReceived extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderChunkReceived().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderChunkReceived().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderChunkReceived().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderChunkReceived, a, b);
  }
};
_TextStreamReaderChunkReceived.runtime = proto2;
_TextStreamReaderChunkReceived.typeName = "livekit.proto.TextStreamReaderChunkReceived";
_TextStreamReaderChunkReceived.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "content", kind: "scalar", T: 9, req: true }
]);
let TextStreamReaderChunkReceived = _TextStreamReaderChunkReceived;
const _TextStreamReaderEOS = class _TextStreamReaderEOS extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamReaderEOS().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamReaderEOS().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamReaderEOS().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamReaderEOS, a, b);
  }
};
_TextStreamReaderEOS.runtime = proto2;
_TextStreamReaderEOS.typeName = "livekit.proto.TextStreamReaderEOS";
_TextStreamReaderEOS.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "error", kind: "message", T: StreamError, opt: true }
]);
let TextStreamReaderEOS = _TextStreamReaderEOS;
const _OwnedByteStreamReader = class _OwnedByteStreamReader extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _OwnedByteStreamReader().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _OwnedByteStreamReader().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _OwnedByteStreamReader().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_OwnedByteStreamReader, a, b);
  }
};
_OwnedByteStreamReader.runtime = proto2;
_OwnedByteStreamReader.typeName = "livekit.proto.OwnedByteStreamReader";
_OwnedByteStreamReader.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "handle", kind: "message", T: FfiOwnedHandle, req: true },
  { no: 2, name: "info", kind: "message", T: ByteStreamInfo, req: true }
]);
let OwnedByteStreamReader = _OwnedByteStreamReader;
const _ByteStreamReaderReadIncrementalRequest = class _ByteStreamReaderReadIncrementalRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderReadIncrementalRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderReadIncrementalRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderReadIncrementalRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderReadIncrementalRequest, a, b);
  }
};
_ByteStreamReaderReadIncrementalRequest.runtime = proto2;
_ByteStreamReaderReadIncrementalRequest.typeName = "livekit.proto.ByteStreamReaderReadIncrementalRequest";
_ByteStreamReaderReadIncrementalRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true }
]);
let ByteStreamReaderReadIncrementalRequest = _ByteStreamReaderReadIncrementalRequest;
const _ByteStreamReaderReadIncrementalResponse = class _ByteStreamReaderReadIncrementalResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderReadIncrementalResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderReadIncrementalResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderReadIncrementalResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderReadIncrementalResponse, a, b);
  }
};
_ByteStreamReaderReadIncrementalResponse.runtime = proto2;
_ByteStreamReaderReadIncrementalResponse.typeName = "livekit.proto.ByteStreamReaderReadIncrementalResponse";
_ByteStreamReaderReadIncrementalResponse.fields = proto2.util.newFieldList(() => []);
let ByteStreamReaderReadIncrementalResponse = _ByteStreamReaderReadIncrementalResponse;
const _ByteStreamReaderReadAllRequest = class _ByteStreamReaderReadAllRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderReadAllRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderReadAllRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderReadAllRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderReadAllRequest, a, b);
  }
};
_ByteStreamReaderReadAllRequest.runtime = proto2;
_ByteStreamReaderReadAllRequest.typeName = "livekit.proto.ByteStreamReaderReadAllRequest";
_ByteStreamReaderReadAllRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true }
]);
let ByteStreamReaderReadAllRequest = _ByteStreamReaderReadAllRequest;
const _ByteStreamReaderReadAllResponse = class _ByteStreamReaderReadAllResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderReadAllResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderReadAllResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderReadAllResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderReadAllResponse, a, b);
  }
};
_ByteStreamReaderReadAllResponse.runtime = proto2;
_ByteStreamReaderReadAllResponse.typeName = "livekit.proto.ByteStreamReaderReadAllResponse";
_ByteStreamReaderReadAllResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let ByteStreamReaderReadAllResponse = _ByteStreamReaderReadAllResponse;
const _ByteStreamReaderReadAllCallback = class _ByteStreamReaderReadAllCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.ByteStreamReaderReadAllCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderReadAllCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderReadAllCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderReadAllCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderReadAllCallback, a, b);
  }
};
_ByteStreamReaderReadAllCallback.runtime = proto2;
_ByteStreamReaderReadAllCallback.typeName = "livekit.proto.ByteStreamReaderReadAllCallback";
_ByteStreamReaderReadAllCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "content", kind: "scalar", T: 12, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let ByteStreamReaderReadAllCallback = _ByteStreamReaderReadAllCallback;
const _ByteStreamReaderWriteToFileRequest = class _ByteStreamReaderWriteToFileRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderWriteToFileRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderWriteToFileRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderWriteToFileRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderWriteToFileRequest, a, b);
  }
};
_ByteStreamReaderWriteToFileRequest.runtime = proto2;
_ByteStreamReaderWriteToFileRequest.typeName = "livekit.proto.ByteStreamReaderWriteToFileRequest";
_ByteStreamReaderWriteToFileRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true },
  { no: 3, name: "directory", kind: "scalar", T: 9, opt: true },
  { no: 4, name: "name_override", kind: "scalar", T: 9, opt: true }
]);
let ByteStreamReaderWriteToFileRequest = _ByteStreamReaderWriteToFileRequest;
const _ByteStreamReaderWriteToFileResponse = class _ByteStreamReaderWriteToFileResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderWriteToFileResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderWriteToFileResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderWriteToFileResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderWriteToFileResponse, a, b);
  }
};
_ByteStreamReaderWriteToFileResponse.runtime = proto2;
_ByteStreamReaderWriteToFileResponse.typeName = "livekit.proto.ByteStreamReaderWriteToFileResponse";
_ByteStreamReaderWriteToFileResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let ByteStreamReaderWriteToFileResponse = _ByteStreamReaderWriteToFileResponse;
const _ByteStreamReaderWriteToFileCallback = class _ByteStreamReaderWriteToFileCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.ByteStreamReaderWriteToFileCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderWriteToFileCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderWriteToFileCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderWriteToFileCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderWriteToFileCallback, a, b);
  }
};
_ByteStreamReaderWriteToFileCallback.runtime = proto2;
_ByteStreamReaderWriteToFileCallback.typeName = "livekit.proto.ByteStreamReaderWriteToFileCallback";
_ByteStreamReaderWriteToFileCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "file_path", kind: "scalar", T: 9, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let ByteStreamReaderWriteToFileCallback = _ByteStreamReaderWriteToFileCallback;
const _ByteStreamReaderEvent = class _ByteStreamReaderEvent extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.ByteStreamReaderEvent.detail
     */
    this.detail = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderEvent().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderEvent().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderEvent().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderEvent, a, b);
  }
};
_ByteStreamReaderEvent.runtime = proto2;
_ByteStreamReaderEvent.typeName = "livekit.proto.ByteStreamReaderEvent";
_ByteStreamReaderEvent.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "reader_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "chunk_received", kind: "message", T: ByteStreamReaderChunkReceived, oneof: "detail" },
  { no: 3, name: "eos", kind: "message", T: ByteStreamReaderEOS, oneof: "detail" }
]);
let ByteStreamReaderEvent = _ByteStreamReaderEvent;
const _ByteStreamReaderChunkReceived = class _ByteStreamReaderChunkReceived extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderChunkReceived().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderChunkReceived().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderChunkReceived().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderChunkReceived, a, b);
  }
};
_ByteStreamReaderChunkReceived.runtime = proto2;
_ByteStreamReaderChunkReceived.typeName = "livekit.proto.ByteStreamReaderChunkReceived";
_ByteStreamReaderChunkReceived.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "content", kind: "scalar", T: 12, req: true }
]);
let ByteStreamReaderChunkReceived = _ByteStreamReaderChunkReceived;
const _ByteStreamReaderEOS = class _ByteStreamReaderEOS extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamReaderEOS().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamReaderEOS().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamReaderEOS().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamReaderEOS, a, b);
  }
};
_ByteStreamReaderEOS.runtime = proto2;
_ByteStreamReaderEOS.typeName = "livekit.proto.ByteStreamReaderEOS";
_ByteStreamReaderEOS.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "error", kind: "message", T: StreamError, opt: true }
]);
let ByteStreamReaderEOS = _ByteStreamReaderEOS;
const _StreamSendFileRequest = class _StreamSendFileRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendFileRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendFileRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendFileRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendFileRequest, a, b);
  }
};
_StreamSendFileRequest.runtime = proto2;
_StreamSendFileRequest.typeName = "livekit.proto.StreamSendFileRequest";
_StreamSendFileRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "local_participant_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "options", kind: "message", T: StreamByteOptions, req: true },
  { no: 3, name: "file_path", kind: "scalar", T: 9, req: true }
]);
let StreamSendFileRequest = _StreamSendFileRequest;
const _StreamSendFileResponse = class _StreamSendFileResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendFileResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendFileResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendFileResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendFileResponse, a, b);
  }
};
_StreamSendFileResponse.runtime = proto2;
_StreamSendFileResponse.typeName = "livekit.proto.StreamSendFileResponse";
_StreamSendFileResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let StreamSendFileResponse = _StreamSendFileResponse;
const _StreamSendFileCallback = class _StreamSendFileCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.StreamSendFileCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendFileCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendFileCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendFileCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendFileCallback, a, b);
  }
};
_StreamSendFileCallback.runtime = proto2;
_StreamSendFileCallback.typeName = "livekit.proto.StreamSendFileCallback";
_StreamSendFileCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "info", kind: "message", T: ByteStreamInfo, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let StreamSendFileCallback = _StreamSendFileCallback;
const _StreamSendTextRequest = class _StreamSendTextRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendTextRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendTextRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendTextRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendTextRequest, a, b);
  }
};
_StreamSendTextRequest.runtime = proto2;
_StreamSendTextRequest.typeName = "livekit.proto.StreamSendTextRequest";
_StreamSendTextRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "local_participant_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "options", kind: "message", T: StreamTextOptions, req: true },
  { no: 3, name: "text", kind: "scalar", T: 9, req: true }
]);
let StreamSendTextRequest = _StreamSendTextRequest;
const _StreamSendTextResponse = class _StreamSendTextResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendTextResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendTextResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendTextResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendTextResponse, a, b);
  }
};
_StreamSendTextResponse.runtime = proto2;
_StreamSendTextResponse.typeName = "livekit.proto.StreamSendTextResponse";
_StreamSendTextResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let StreamSendTextResponse = _StreamSendTextResponse;
const _StreamSendTextCallback = class _StreamSendTextCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.StreamSendTextCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamSendTextCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamSendTextCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamSendTextCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamSendTextCallback, a, b);
  }
};
_StreamSendTextCallback.runtime = proto2;
_StreamSendTextCallback.typeName = "livekit.proto.StreamSendTextCallback";
_StreamSendTextCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "info", kind: "message", T: TextStreamInfo, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let StreamSendTextCallback = _StreamSendTextCallback;
const _OwnedByteStreamWriter = class _OwnedByteStreamWriter extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _OwnedByteStreamWriter().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _OwnedByteStreamWriter().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _OwnedByteStreamWriter().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_OwnedByteStreamWriter, a, b);
  }
};
_OwnedByteStreamWriter.runtime = proto2;
_OwnedByteStreamWriter.typeName = "livekit.proto.OwnedByteStreamWriter";
_OwnedByteStreamWriter.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "handle", kind: "message", T: FfiOwnedHandle, req: true },
  { no: 2, name: "info", kind: "message", T: ByteStreamInfo, req: true }
]);
let OwnedByteStreamWriter = _OwnedByteStreamWriter;
const _ByteStreamOpenRequest = class _ByteStreamOpenRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamOpenRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamOpenRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamOpenRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamOpenRequest, a, b);
  }
};
_ByteStreamOpenRequest.runtime = proto2;
_ByteStreamOpenRequest.typeName = "livekit.proto.ByteStreamOpenRequest";
_ByteStreamOpenRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "local_participant_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "options", kind: "message", T: StreamByteOptions, req: true }
]);
let ByteStreamOpenRequest = _ByteStreamOpenRequest;
const _ByteStreamOpenResponse = class _ByteStreamOpenResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamOpenResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamOpenResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamOpenResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamOpenResponse, a, b);
  }
};
_ByteStreamOpenResponse.runtime = proto2;
_ByteStreamOpenResponse.typeName = "livekit.proto.ByteStreamOpenResponse";
_ByteStreamOpenResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let ByteStreamOpenResponse = _ByteStreamOpenResponse;
const _ByteStreamOpenCallback = class _ByteStreamOpenCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.ByteStreamOpenCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamOpenCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamOpenCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamOpenCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamOpenCallback, a, b);
  }
};
_ByteStreamOpenCallback.runtime = proto2;
_ByteStreamOpenCallback.typeName = "livekit.proto.ByteStreamOpenCallback";
_ByteStreamOpenCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "writer", kind: "message", T: OwnedByteStreamWriter, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let ByteStreamOpenCallback = _ByteStreamOpenCallback;
const _ByteStreamWriterWriteRequest = class _ByteStreamWriterWriteRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterWriteRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterWriteRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterWriteRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterWriteRequest, a, b);
  }
};
_ByteStreamWriterWriteRequest.runtime = proto2;
_ByteStreamWriterWriteRequest.typeName = "livekit.proto.ByteStreamWriterWriteRequest";
_ByteStreamWriterWriteRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "writer_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "bytes", kind: "scalar", T: 12, req: true }
]);
let ByteStreamWriterWriteRequest = _ByteStreamWriterWriteRequest;
const _ByteStreamWriterWriteResponse = class _ByteStreamWriterWriteResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterWriteResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterWriteResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterWriteResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterWriteResponse, a, b);
  }
};
_ByteStreamWriterWriteResponse.runtime = proto2;
_ByteStreamWriterWriteResponse.typeName = "livekit.proto.ByteStreamWriterWriteResponse";
_ByteStreamWriterWriteResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let ByteStreamWriterWriteResponse = _ByteStreamWriterWriteResponse;
const _ByteStreamWriterWriteCallback = class _ByteStreamWriterWriteCallback extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterWriteCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterWriteCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterWriteCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterWriteCallback, a, b);
  }
};
_ByteStreamWriterWriteCallback.runtime = proto2;
_ByteStreamWriterWriteCallback.typeName = "livekit.proto.ByteStreamWriterWriteCallback";
_ByteStreamWriterWriteCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "error", kind: "message", T: StreamError, opt: true }
]);
let ByteStreamWriterWriteCallback = _ByteStreamWriterWriteCallback;
const _ByteStreamWriterCloseRequest = class _ByteStreamWriterCloseRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterCloseRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterCloseRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterCloseRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterCloseRequest, a, b);
  }
};
_ByteStreamWriterCloseRequest.runtime = proto2;
_ByteStreamWriterCloseRequest.typeName = "livekit.proto.ByteStreamWriterCloseRequest";
_ByteStreamWriterCloseRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "writer_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "reason", kind: "scalar", T: 9, opt: true }
]);
let ByteStreamWriterCloseRequest = _ByteStreamWriterCloseRequest;
const _ByteStreamWriterCloseResponse = class _ByteStreamWriterCloseResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterCloseResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterCloseResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterCloseResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterCloseResponse, a, b);
  }
};
_ByteStreamWriterCloseResponse.runtime = proto2;
_ByteStreamWriterCloseResponse.typeName = "livekit.proto.ByteStreamWriterCloseResponse";
_ByteStreamWriterCloseResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let ByteStreamWriterCloseResponse = _ByteStreamWriterCloseResponse;
const _ByteStreamWriterCloseCallback = class _ByteStreamWriterCloseCallback extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamWriterCloseCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamWriterCloseCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamWriterCloseCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamWriterCloseCallback, a, b);
  }
};
_ByteStreamWriterCloseCallback.runtime = proto2;
_ByteStreamWriterCloseCallback.typeName = "livekit.proto.ByteStreamWriterCloseCallback";
_ByteStreamWriterCloseCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "error", kind: "message", T: StreamError, opt: true }
]);
let ByteStreamWriterCloseCallback = _ByteStreamWriterCloseCallback;
const _OwnedTextStreamWriter = class _OwnedTextStreamWriter extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _OwnedTextStreamWriter().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _OwnedTextStreamWriter().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _OwnedTextStreamWriter().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_OwnedTextStreamWriter, a, b);
  }
};
_OwnedTextStreamWriter.runtime = proto2;
_OwnedTextStreamWriter.typeName = "livekit.proto.OwnedTextStreamWriter";
_OwnedTextStreamWriter.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "handle", kind: "message", T: FfiOwnedHandle, req: true },
  { no: 2, name: "info", kind: "message", T: TextStreamInfo, req: true }
]);
let OwnedTextStreamWriter = _OwnedTextStreamWriter;
const _TextStreamOpenRequest = class _TextStreamOpenRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamOpenRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamOpenRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamOpenRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamOpenRequest, a, b);
  }
};
_TextStreamOpenRequest.runtime = proto2;
_TextStreamOpenRequest.typeName = "livekit.proto.TextStreamOpenRequest";
_TextStreamOpenRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "local_participant_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "options", kind: "message", T: StreamTextOptions, req: true }
]);
let TextStreamOpenRequest = _TextStreamOpenRequest;
const _TextStreamOpenResponse = class _TextStreamOpenResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamOpenResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamOpenResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamOpenResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamOpenResponse, a, b);
  }
};
_TextStreamOpenResponse.runtime = proto2;
_TextStreamOpenResponse.typeName = "livekit.proto.TextStreamOpenResponse";
_TextStreamOpenResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let TextStreamOpenResponse = _TextStreamOpenResponse;
const _TextStreamOpenCallback = class _TextStreamOpenCallback extends Message {
  constructor(data) {
    super();
    /**
     * @generated from oneof livekit.proto.TextStreamOpenCallback.result
     */
    this.result = { case: void 0 };
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamOpenCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamOpenCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamOpenCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamOpenCallback, a, b);
  }
};
_TextStreamOpenCallback.runtime = proto2;
_TextStreamOpenCallback.typeName = "livekit.proto.TextStreamOpenCallback";
_TextStreamOpenCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "writer", kind: "message", T: OwnedTextStreamWriter, oneof: "result" },
  { no: 3, name: "error", kind: "message", T: StreamError, oneof: "result" }
]);
let TextStreamOpenCallback = _TextStreamOpenCallback;
const _TextStreamWriterWriteRequest = class _TextStreamWriterWriteRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterWriteRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterWriteRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterWriteRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterWriteRequest, a, b);
  }
};
_TextStreamWriterWriteRequest.runtime = proto2;
_TextStreamWriterWriteRequest.typeName = "livekit.proto.TextStreamWriterWriteRequest";
_TextStreamWriterWriteRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "writer_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "text", kind: "scalar", T: 9, req: true }
]);
let TextStreamWriterWriteRequest = _TextStreamWriterWriteRequest;
const _TextStreamWriterWriteResponse = class _TextStreamWriterWriteResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterWriteResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterWriteResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterWriteResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterWriteResponse, a, b);
  }
};
_TextStreamWriterWriteResponse.runtime = proto2;
_TextStreamWriterWriteResponse.typeName = "livekit.proto.TextStreamWriterWriteResponse";
_TextStreamWriterWriteResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let TextStreamWriterWriteResponse = _TextStreamWriterWriteResponse;
const _TextStreamWriterWriteCallback = class _TextStreamWriterWriteCallback extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterWriteCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterWriteCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterWriteCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterWriteCallback, a, b);
  }
};
_TextStreamWriterWriteCallback.runtime = proto2;
_TextStreamWriterWriteCallback.typeName = "livekit.proto.TextStreamWriterWriteCallback";
_TextStreamWriterWriteCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "error", kind: "message", T: StreamError, opt: true }
]);
let TextStreamWriterWriteCallback = _TextStreamWriterWriteCallback;
const _TextStreamWriterCloseRequest = class _TextStreamWriterCloseRequest extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterCloseRequest().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterCloseRequest().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterCloseRequest().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterCloseRequest, a, b);
  }
};
_TextStreamWriterCloseRequest.runtime = proto2;
_TextStreamWriterCloseRequest.typeName = "livekit.proto.TextStreamWriterCloseRequest";
_TextStreamWriterCloseRequest.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "writer_handle", kind: "scalar", T: 4, req: true },
  { no: 2, name: "reason", kind: "scalar", T: 9, opt: true }
]);
let TextStreamWriterCloseRequest = _TextStreamWriterCloseRequest;
const _TextStreamWriterCloseResponse = class _TextStreamWriterCloseResponse extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterCloseResponse().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterCloseResponse().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterCloseResponse().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterCloseResponse, a, b);
  }
};
_TextStreamWriterCloseResponse.runtime = proto2;
_TextStreamWriterCloseResponse.typeName = "livekit.proto.TextStreamWriterCloseResponse";
_TextStreamWriterCloseResponse.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true }
]);
let TextStreamWriterCloseResponse = _TextStreamWriterCloseResponse;
const _TextStreamWriterCloseCallback = class _TextStreamWriterCloseCallback extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamWriterCloseCallback().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamWriterCloseCallback().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamWriterCloseCallback().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamWriterCloseCallback, a, b);
  }
};
_TextStreamWriterCloseCallback.runtime = proto2;
_TextStreamWriterCloseCallback.typeName = "livekit.proto.TextStreamWriterCloseCallback";
_TextStreamWriterCloseCallback.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "async_id", kind: "scalar", T: 4, req: true },
  { no: 2, name: "error", kind: "message", T: StreamError, opt: true }
]);
let TextStreamWriterCloseCallback = _TextStreamWriterCloseCallback;
const _TextStreamInfo = class _TextStreamInfo extends Message {
  constructor(data) {
    super();
    /**
     * user defined attributes map that can carry additional info
     *
     * @generated from field: map<string, string> attributes = 6;
     */
    this.attributes = {};
    /**
     * file attachments for text streams
     *
     * @generated from field: repeated string attached_stream_ids = 10;
     */
    this.attachedStreamIds = [];
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _TextStreamInfo().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _TextStreamInfo().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _TextStreamInfo().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_TextStreamInfo, a, b);
  }
};
_TextStreamInfo.runtime = proto2;
_TextStreamInfo.typeName = "livekit.proto.TextStreamInfo";
_TextStreamInfo.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "stream_id", kind: "scalar", T: 9, req: true },
  { no: 2, name: "timestamp", kind: "scalar", T: 3, req: true },
  { no: 3, name: "mime_type", kind: "scalar", T: 9, req: true },
  { no: 4, name: "topic", kind: "scalar", T: 9, req: true },
  { no: 5, name: "total_length", kind: "scalar", T: 4, opt: true },
  { no: 6, name: "attributes", kind: "map", K: 9, V: {
    kind: "scalar",
    T: 9
    /* ScalarType.STRING */
  } },
  { no: 7, name: "operation_type", kind: "enum", T: proto2.getEnumType(TextStreamInfo_OperationType), req: true },
  { no: 8, name: "version", kind: "scalar", T: 5, opt: true },
  { no: 9, name: "reply_to_stream_id", kind: "scalar", T: 9, opt: true },
  { no: 10, name: "attached_stream_ids", kind: "scalar", T: 9, repeated: true },
  { no: 11, name: "generated", kind: "scalar", T: 8, opt: true }
]);
let TextStreamInfo = _TextStreamInfo;
var TextStreamInfo_OperationType = /* @__PURE__ */ ((TextStreamInfo_OperationType2) => {
  TextStreamInfo_OperationType2[TextStreamInfo_OperationType2["CREATE"] = 0] = "CREATE";
  TextStreamInfo_OperationType2[TextStreamInfo_OperationType2["UPDATE"] = 1] = "UPDATE";
  TextStreamInfo_OperationType2[TextStreamInfo_OperationType2["DELETE"] = 2] = "DELETE";
  TextStreamInfo_OperationType2[TextStreamInfo_OperationType2["REACTION"] = 3] = "REACTION";
  return TextStreamInfo_OperationType2;
})(TextStreamInfo_OperationType || {});
proto2.util.setEnumType(TextStreamInfo_OperationType, "livekit.proto.TextStreamInfo.OperationType", [
  { no: 0, name: "CREATE" },
  { no: 1, name: "UPDATE" },
  { no: 2, name: "DELETE" },
  { no: 3, name: "REACTION" }
]);
const _ByteStreamInfo = class _ByteStreamInfo extends Message {
  constructor(data) {
    super();
    /**
     * user defined attributes map that can carry additional info
     *
     * @generated from field: map<string, string> attributes = 6;
     */
    this.attributes = {};
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _ByteStreamInfo().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _ByteStreamInfo().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _ByteStreamInfo().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_ByteStreamInfo, a, b);
  }
};
_ByteStreamInfo.runtime = proto2;
_ByteStreamInfo.typeName = "livekit.proto.ByteStreamInfo";
_ByteStreamInfo.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "stream_id", kind: "scalar", T: 9, req: true },
  { no: 2, name: "timestamp", kind: "scalar", T: 3, req: true },
  { no: 3, name: "mime_type", kind: "scalar", T: 9, req: true },
  { no: 4, name: "topic", kind: "scalar", T: 9, req: true },
  { no: 5, name: "total_length", kind: "scalar", T: 4, opt: true },
  { no: 6, name: "attributes", kind: "map", K: 9, V: {
    kind: "scalar",
    T: 9
    /* ScalarType.STRING */
  } },
  { no: 7, name: "name", kind: "scalar", T: 9, req: true }
]);
let ByteStreamInfo = _ByteStreamInfo;
const _StreamTextOptions = class _StreamTextOptions extends Message {
  constructor(data) {
    super();
    /**
     * @generated from field: map<string, string> attributes = 2;
     */
    this.attributes = {};
    /**
     * @generated from field: repeated string destination_identities = 3;
     */
    this.destinationIdentities = [];
    /**
     * @generated from field: repeated string attached_stream_ids = 8;
     */
    this.attachedStreamIds = [];
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamTextOptions().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamTextOptions().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamTextOptions().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamTextOptions, a, b);
  }
};
_StreamTextOptions.runtime = proto2;
_StreamTextOptions.typeName = "livekit.proto.StreamTextOptions";
_StreamTextOptions.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "topic", kind: "scalar", T: 9, req: true },
  { no: 2, name: "attributes", kind: "map", K: 9, V: {
    kind: "scalar",
    T: 9
    /* ScalarType.STRING */
  } },
  { no: 3, name: "destination_identities", kind: "scalar", T: 9, repeated: true },
  { no: 4, name: "id", kind: "scalar", T: 9, opt: true },
  { no: 5, name: "operation_type", kind: "enum", T: proto2.getEnumType(TextStreamInfo_OperationType), opt: true },
  { no: 6, name: "version", kind: "scalar", T: 5, opt: true },
  { no: 7, name: "reply_to_stream_id", kind: "scalar", T: 9, opt: true },
  { no: 8, name: "attached_stream_ids", kind: "scalar", T: 9, repeated: true },
  { no: 9, name: "generated", kind: "scalar", T: 8, opt: true }
]);
let StreamTextOptions = _StreamTextOptions;
const _StreamByteOptions = class _StreamByteOptions extends Message {
  constructor(data) {
    super();
    /**
     * @generated from field: map<string, string> attributes = 2;
     */
    this.attributes = {};
    /**
     * @generated from field: repeated string destination_identities = 3;
     */
    this.destinationIdentities = [];
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamByteOptions().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamByteOptions().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamByteOptions().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamByteOptions, a, b);
  }
};
_StreamByteOptions.runtime = proto2;
_StreamByteOptions.typeName = "livekit.proto.StreamByteOptions";
_StreamByteOptions.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "topic", kind: "scalar", T: 9, req: true },
  { no: 2, name: "attributes", kind: "map", K: 9, V: {
    kind: "scalar",
    T: 9
    /* ScalarType.STRING */
  } },
  { no: 3, name: "destination_identities", kind: "scalar", T: 9, repeated: true },
  { no: 4, name: "id", kind: "scalar", T: 9, opt: true },
  { no: 5, name: "name", kind: "scalar", T: 9, opt: true },
  { no: 6, name: "mime_type", kind: "scalar", T: 9, opt: true },
  { no: 7, name: "total_length", kind: "scalar", T: 4, opt: true }
]);
let StreamByteOptions = _StreamByteOptions;
const _StreamError = class _StreamError extends Message {
  constructor(data) {
    super();
    proto2.util.initPartial(data, this);
  }
  static fromBinary(bytes, options) {
    return new _StreamError().fromBinary(bytes, options);
  }
  static fromJson(jsonValue, options) {
    return new _StreamError().fromJson(jsonValue, options);
  }
  static fromJsonString(jsonString, options) {
    return new _StreamError().fromJsonString(jsonString, options);
  }
  static equals(a, b) {
    return proto2.util.equals(_StreamError, a, b);
  }
};
_StreamError.runtime = proto2;
_StreamError.typeName = "livekit.proto.StreamError";
_StreamError.fields = proto2.util.newFieldList(() => [
  { no: 1, name: "description", kind: "scalar", T: 9, req: true }
]);
let StreamError = _StreamError;
export {
  ByteStreamInfo,
  ByteStreamOpenCallback,
  ByteStreamOpenRequest,
  ByteStreamOpenResponse,
  ByteStreamReaderChunkReceived,
  ByteStreamReaderEOS,
  ByteStreamReaderEvent,
  ByteStreamReaderReadAllCallback,
  ByteStreamReaderReadAllRequest,
  ByteStreamReaderReadAllResponse,
  ByteStreamReaderReadIncrementalRequest,
  ByteStreamReaderReadIncrementalResponse,
  ByteStreamReaderWriteToFileCallback,
  ByteStreamReaderWriteToFileRequest,
  ByteStreamReaderWriteToFileResponse,
  ByteStreamWriterCloseCallback,
  ByteStreamWriterCloseRequest,
  ByteStreamWriterCloseResponse,
  ByteStreamWriterWriteCallback,
  ByteStreamWriterWriteRequest,
  ByteStreamWriterWriteResponse,
  OwnedByteStreamReader,
  OwnedByteStreamWriter,
  OwnedTextStreamReader,
  OwnedTextStreamWriter,
  StreamByteOptions,
  StreamError,
  StreamSendFileCallback,
  StreamSendFileRequest,
  StreamSendFileResponse,
  StreamSendTextCallback,
  StreamSendTextRequest,
  StreamSendTextResponse,
  StreamTextOptions,
  TextStreamInfo,
  TextStreamInfo_OperationType,
  TextStreamOpenCallback,
  TextStreamOpenRequest,
  TextStreamOpenResponse,
  TextStreamReaderChunkReceived,
  TextStreamReaderEOS,
  TextStreamReaderEvent,
  TextStreamReaderReadAllCallback,
  TextStreamReaderReadAllRequest,
  TextStreamReaderReadAllResponse,
  TextStreamReaderReadIncrementalRequest,
  TextStreamReaderReadIncrementalResponse,
  TextStreamWriterCloseCallback,
  TextStreamWriterCloseRequest,
  TextStreamWriterCloseResponse,
  TextStreamWriterWriteCallback,
  TextStreamWriterWriteRequest,
  TextStreamWriterWriteResponse
};
//# sourceMappingURL=data_stream_pb.js.map