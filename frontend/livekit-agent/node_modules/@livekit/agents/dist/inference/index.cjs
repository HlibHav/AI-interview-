"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var inference_exports = {};
__export(inference_exports, {
  LLM: () => import_llm.LLM,
  LLMStream: () => import_llm.LLMStream,
  STT: () => import_stt.STT,
  TTS: () => import_tts.TTS,
  llm: () => llm,
  stt: () => stt,
  tts: () => tts
});
module.exports = __toCommonJS(inference_exports);
var llm = __toESM(require("./llm.cjs"), 1);
var stt = __toESM(require("./stt.cjs"), 1);
var tts = __toESM(require("./tts.cjs"), 1);
var import_llm = require("./llm.cjs");
var import_stt = require("./stt.cjs");
var import_tts = require("./tts.cjs");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LLM,
  LLMStream,
  STT,
  TTS,
  llm,
  stt,
  tts
});
//# sourceMappingURL=index.cjs.map