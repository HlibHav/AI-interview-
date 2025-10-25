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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var index_exports = {};
__export(index_exports, {
  cli: () => cli,
  inference: () => inference,
  ipc: () => ipc,
  llm: () => llm,
  metrics: () => metrics,
  stream: () => stream,
  stt: () => stt,
  tokenize: () => tokenize,
  tts: () => tts,
  voice: () => voice
});
module.exports = __toCommonJS(index_exports);
var cli = __toESM(require("./cli.cjs"), 1);
var inference = __toESM(require("./inference/index.cjs"), 1);
var ipc = __toESM(require("./ipc/index.cjs"), 1);
var llm = __toESM(require("./llm/index.cjs"), 1);
var metrics = __toESM(require("./metrics/index.cjs"), 1);
var stream = __toESM(require("./stream/index.cjs"), 1);
var stt = __toESM(require("./stt/index.cjs"), 1);
var tokenize = __toESM(require("./tokenize/index.cjs"), 1);
var tts = __toESM(require("./tts/index.cjs"), 1);
var voice = __toESM(require("./voice/index.cjs"), 1);
__reExport(index_exports, require("./_exceptions.cjs"), module.exports);
__reExport(index_exports, require("./audio.cjs"), module.exports);
__reExport(index_exports, require("./generator.cjs"), module.exports);
__reExport(index_exports, require("./inference_runner.cjs"), module.exports);
__reExport(index_exports, require("./job.cjs"), module.exports);
__reExport(index_exports, require("./log.cjs"), module.exports);
__reExport(index_exports, require("./plugin.cjs"), module.exports);
__reExport(index_exports, require("./transcription.cjs"), module.exports);
__reExport(index_exports, require("./types.cjs"), module.exports);
__reExport(index_exports, require("./utils.cjs"), module.exports);
__reExport(index_exports, require("./vad.cjs"), module.exports);
__reExport(index_exports, require("./version.cjs"), module.exports);
__reExport(index_exports, require("./worker.cjs"), module.exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cli,
  inference,
  ipc,
  llm,
  metrics,
  stream,
  stt,
  tokenize,
  tts,
  voice,
  ...require("./_exceptions.cjs"),
  ...require("./audio.cjs"),
  ...require("./generator.cjs"),
  ...require("./inference_runner.cjs"),
  ...require("./job.cjs"),
  ...require("./log.cjs"),
  ...require("./plugin.cjs"),
  ...require("./transcription.cjs"),
  ...require("./types.cjs"),
  ...require("./utils.cjs"),
  ...require("./vad.cjs"),
  ...require("./version.cjs"),
  ...require("./worker.cjs")
});
//# sourceMappingURL=index.cjs.map