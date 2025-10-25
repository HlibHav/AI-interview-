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
var api_proto_exports = {};
__export(api_proto_exports, {
  BASE_URL: () => BASE_URL,
  IN_FRAME_SIZE: () => IN_FRAME_SIZE,
  NUM_CHANNELS: () => NUM_CHANNELS,
  OUT_FRAME_SIZE: () => OUT_FRAME_SIZE,
  SAMPLE_RATE: () => SAMPLE_RATE
});
module.exports = __toCommonJS(api_proto_exports);
const SAMPLE_RATE = 24e3;
const NUM_CHANNELS = 1;
const IN_FRAME_SIZE = 2400;
const OUT_FRAME_SIZE = 1200;
const BASE_URL = "wss://api.openai.com/v1";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BASE_URL,
  IN_FRAME_SIZE,
  NUM_CHANNELS,
  OUT_FRAME_SIZE,
  SAMPLE_RATE
});
//# sourceMappingURL=api_proto.cjs.map