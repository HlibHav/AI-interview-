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
var stt_exports = {};
__export(stt_exports, {
  STT: () => import_stt.STT,
  SpeechEventType: () => import_stt.SpeechEventType,
  SpeechStream: () => import_stt.SpeechStream,
  StreamAdapter: () => import_stream_adapter.StreamAdapter,
  StreamAdapterWrapper: () => import_stream_adapter.StreamAdapterWrapper
});
module.exports = __toCommonJS(stt_exports);
var import_stt = require("./stt.cjs");
var import_stream_adapter = require("./stream_adapter.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STT,
  SpeechEventType,
  SpeechStream,
  StreamAdapter,
  StreamAdapterWrapper
});
//# sourceMappingURL=index.cjs.map