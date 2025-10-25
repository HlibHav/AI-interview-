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
var stream_exports = {};
__export(stream_exports, {
  DeferredReadableStream: () => import_deferred_stream.DeferredReadableStream,
  IdentityTransform: () => import_identity_transform.IdentityTransform,
  createStreamChannel: () => import_stream_channel.createStreamChannel,
  mergeReadableStreams: () => import_merge_readable_streams.mergeReadableStreams
});
module.exports = __toCommonJS(stream_exports);
var import_deferred_stream = require("./deferred_stream.cjs");
var import_identity_transform = require("./identity_transform.cjs");
var import_merge_readable_streams = require("./merge_readable_streams.cjs");
var import_stream_channel = require("./stream_channel.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DeferredReadableStream,
  IdentityTransform,
  createStreamChannel,
  mergeReadableStreams
});
//# sourceMappingURL=index.cjs.map