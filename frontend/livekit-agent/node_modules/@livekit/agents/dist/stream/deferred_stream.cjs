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
var deferred_stream_exports = {};
__export(deferred_stream_exports, {
  DeferredReadableStream: () => DeferredReadableStream,
  isStreamReaderReleaseError: () => isStreamReaderReleaseError
});
module.exports = __toCommonJS(deferred_stream_exports);
var import_identity_transform = require("./identity_transform.cjs");
function isStreamReaderReleaseError(e) {
  const allowedMessages = [
    "Invalid state: Releasing reader",
    "Invalid state: The reader is not attached to a stream"
  ];
  if (e instanceof TypeError) {
    return allowedMessages.some((message) => e.message.includes(message));
  }
  return false;
}
class DeferredReadableStream {
  transform;
  writer;
  sourceReader;
  constructor() {
    this.transform = new import_identity_transform.IdentityTransform();
    this.writer = this.transform.writable.getWriter();
  }
  get stream() {
    return this.transform.readable;
  }
  get isSourceSet() {
    return !!this.sourceReader;
  }
  /**
   * Call once the actual source is ready.
   */
  setSource(source) {
    if (this.isSourceSet) {
      throw new Error("Stream source already set");
    }
    this.sourceReader = source.getReader();
    this.pump();
  }
  async pump() {
    let sourceError;
    try {
      while (true) {
        const { done, value } = await this.sourceReader.read();
        if (done) break;
        await this.writer.write(value);
      }
    } catch (e) {
      if (isStreamReaderReleaseError(e)) return;
      sourceError = e;
    } finally {
      if (sourceError) {
        this.writer.abort(sourceError);
        return;
      }
      this.writer.releaseLock();
      try {
        await this.transform.writable.close();
      } catch (e) {
      }
    }
  }
  /**
   * Detach the source stream and clean up resources.
   */
  async detachSource() {
    if (!this.isSourceSet) {
      throw new Error("Source not set");
    }
    this.sourceReader.releaseLock();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DeferredReadableStream,
  isStreamReaderReleaseError
});
//# sourceMappingURL=deferred_stream.cjs.map