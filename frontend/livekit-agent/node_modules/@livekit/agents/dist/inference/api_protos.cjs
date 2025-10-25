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
var api_protos_exports = {};
__export(api_protos_exports, {
  ttsClientEventSchema: () => ttsClientEventSchema,
  ttsDoneEventSchema: () => ttsDoneEventSchema,
  ttsErrorEventSchema: () => ttsErrorEventSchema,
  ttsInputTranscriptEventSchema: () => ttsInputTranscriptEventSchema,
  ttsOutputAudioEventSchema: () => ttsOutputAudioEventSchema,
  ttsServerEventSchema: () => ttsServerEventSchema,
  ttsSessionCloseEventSchema: () => ttsSessionCloseEventSchema,
  ttsSessionClosedEventSchema: () => ttsSessionClosedEventSchema,
  ttsSessionCreateEventSchema: () => ttsSessionCreateEventSchema,
  ttsSessionCreatedEventSchema: () => ttsSessionCreatedEventSchema,
  ttsSessionFlushEventSchema: () => ttsSessionFlushEventSchema
});
module.exports = __toCommonJS(api_protos_exports);
var import_zod = require("zod");
const ttsSessionCreateEventSchema = import_zod.z.object({
  type: import_zod.z.literal("session.create"),
  sample_rate: import_zod.z.string(),
  encoding: import_zod.z.string(),
  model: import_zod.z.string().optional(),
  voice: import_zod.z.string().optional(),
  language: import_zod.z.string().optional(),
  extra: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()),
  transcript: import_zod.z.string().optional()
});
const ttsInputTranscriptEventSchema = import_zod.z.object({
  type: import_zod.z.literal("input_transcript"),
  transcript: import_zod.z.string()
});
const ttsSessionFlushEventSchema = import_zod.z.object({
  type: import_zod.z.literal("session.flush")
});
const ttsSessionCloseEventSchema = import_zod.z.object({
  type: import_zod.z.literal("session.close")
});
const ttsSessionCreatedEventSchema = import_zod.z.object({
  type: import_zod.z.literal("session.created"),
  session_id: import_zod.z.string()
});
const ttsOutputAudioEventSchema = import_zod.z.object({
  type: import_zod.z.literal("output_audio"),
  audio: import_zod.z.string(),
  session_id: import_zod.z.string()
});
const ttsDoneEventSchema = import_zod.z.object({
  type: import_zod.z.literal("done"),
  session_id: import_zod.z.string()
});
const ttsSessionClosedEventSchema = import_zod.z.object({
  type: import_zod.z.literal("session.closed"),
  session_id: import_zod.z.string()
});
const ttsErrorEventSchema = import_zod.z.object({
  type: import_zod.z.literal("error"),
  message: import_zod.z.string(),
  session_id: import_zod.z.string()
});
const ttsClientEventSchema = import_zod.z.discriminatedUnion("type", [
  ttsSessionCreateEventSchema,
  ttsInputTranscriptEventSchema,
  ttsSessionFlushEventSchema,
  ttsSessionCloseEventSchema
]);
const ttsServerEventSchema = import_zod.z.discriminatedUnion("type", [
  ttsSessionCreatedEventSchema,
  ttsOutputAudioEventSchema,
  ttsDoneEventSchema,
  ttsSessionClosedEventSchema,
  ttsErrorEventSchema
]);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ttsClientEventSchema,
  ttsDoneEventSchema,
  ttsErrorEventSchema,
  ttsInputTranscriptEventSchema,
  ttsOutputAudioEventSchema,
  ttsServerEventSchema,
  ttsSessionCloseEventSchema,
  ttsSessionClosedEventSchema,
  ttsSessionCreateEventSchema,
  ttsSessionCreatedEventSchema,
  ttsSessionFlushEventSchema
});
//# sourceMappingURL=api_protos.cjs.map