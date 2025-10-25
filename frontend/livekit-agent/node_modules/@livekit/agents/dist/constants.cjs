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
var constants_exports = {};
__export(constants_exports, {
  ATTRIBUTE_PUBLISH_ON_BEHALF: () => ATTRIBUTE_PUBLISH_ON_BEHALF,
  ATTRIBUTE_TRANSCRIPTION_FINAL: () => ATTRIBUTE_TRANSCRIPTION_FINAL,
  ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID: () => ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID,
  ATTRIBUTE_TRANSCRIPTION_TRACK_ID: () => ATTRIBUTE_TRANSCRIPTION_TRACK_ID,
  TOPIC_CHAT: () => TOPIC_CHAT,
  TOPIC_TRANSCRIPTION: () => TOPIC_TRANSCRIPTION
});
module.exports = __toCommonJS(constants_exports);
const ATTRIBUTE_TRANSCRIPTION_TRACK_ID = "lk.transcribed_track_id";
const ATTRIBUTE_TRANSCRIPTION_FINAL = "lk.transcription_final";
const TOPIC_TRANSCRIPTION = "lk.transcription";
const ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID = "lk.segment_id";
const ATTRIBUTE_PUBLISH_ON_BEHALF = "lk.publish_on_behalf";
const TOPIC_CHAT = "lk.chat";
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ATTRIBUTE_PUBLISH_ON_BEHALF,
  ATTRIBUTE_TRANSCRIPTION_FINAL,
  ATTRIBUTE_TRANSCRIPTION_SEGMENT_ID,
  ATTRIBUTE_TRANSCRIPTION_TRACK_ID,
  TOPIC_CHAT,
  TOPIC_TRANSCRIPTION
});
//# sourceMappingURL=constants.cjs.map