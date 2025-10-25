import { z } from "zod";
const ttsSessionCreateEventSchema = z.object({
  type: z.literal("session.create"),
  sample_rate: z.string(),
  encoding: z.string(),
  model: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
  extra: z.record(z.string(), z.unknown()),
  transcript: z.string().optional()
});
const ttsInputTranscriptEventSchema = z.object({
  type: z.literal("input_transcript"),
  transcript: z.string()
});
const ttsSessionFlushEventSchema = z.object({
  type: z.literal("session.flush")
});
const ttsSessionCloseEventSchema = z.object({
  type: z.literal("session.close")
});
const ttsSessionCreatedEventSchema = z.object({
  type: z.literal("session.created"),
  session_id: z.string()
});
const ttsOutputAudioEventSchema = z.object({
  type: z.literal("output_audio"),
  audio: z.string(),
  session_id: z.string()
});
const ttsDoneEventSchema = z.object({
  type: z.literal("done"),
  session_id: z.string()
});
const ttsSessionClosedEventSchema = z.object({
  type: z.literal("session.closed"),
  session_id: z.string()
});
const ttsErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
  session_id: z.string()
});
const ttsClientEventSchema = z.discriminatedUnion("type", [
  ttsSessionCreateEventSchema,
  ttsInputTranscriptEventSchema,
  ttsSessionFlushEventSchema,
  ttsSessionCloseEventSchema
]);
const ttsServerEventSchema = z.discriminatedUnion("type", [
  ttsSessionCreatedEventSchema,
  ttsOutputAudioEventSchema,
  ttsDoneEventSchema,
  ttsSessionClosedEventSchema,
  ttsErrorEventSchema
]);
export {
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
};
//# sourceMappingURL=api_protos.js.map