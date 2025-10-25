import { z } from 'zod';
export declare const ttsSessionCreateEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"session.create">;
    sample_rate: z.ZodString;
    encoding: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    voice: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    extra: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    transcript: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "session.create";
    encoding: string;
    sample_rate: string;
    extra: Record<string, unknown>;
    language?: string | undefined;
    transcript?: string | undefined;
    model?: string | undefined;
    voice?: string | undefined;
}, {
    type: "session.create";
    encoding: string;
    sample_rate: string;
    extra: Record<string, unknown>;
    language?: string | undefined;
    transcript?: string | undefined;
    model?: string | undefined;
    voice?: string | undefined;
}>;
export declare const ttsInputTranscriptEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"input_transcript">;
    transcript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "input_transcript";
    transcript: string;
}, {
    type: "input_transcript";
    transcript: string;
}>;
export declare const ttsSessionFlushEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"session.flush">;
}, "strip", z.ZodTypeAny, {
    type: "session.flush";
}, {
    type: "session.flush";
}>;
export declare const ttsSessionCloseEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"session.close">;
}, "strip", z.ZodTypeAny, {
    type: "session.close";
}, {
    type: "session.close";
}>;
export declare const ttsSessionCreatedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"session.created">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "session.created";
    session_id: string;
}, {
    type: "session.created";
    session_id: string;
}>;
export declare const ttsOutputAudioEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"output_audio">;
    audio: z.ZodString;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "output_audio";
    audio: string;
    session_id: string;
}, {
    type: "output_audio";
    audio: string;
    session_id: string;
}>;
export declare const ttsDoneEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"done">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "done";
    session_id: string;
}, {
    type: "done";
    session_id: string;
}>;
export declare const ttsSessionClosedEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"session.closed">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "session.closed";
    session_id: string;
}, {
    type: "session.closed";
    session_id: string;
}>;
export declare const ttsErrorEventSchema: z.ZodObject<{
    type: z.ZodLiteral<"error">;
    message: z.ZodString;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "error";
    session_id: string;
}, {
    message: string;
    type: "error";
    session_id: string;
}>;
export declare const ttsClientEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"session.create">;
    sample_rate: z.ZodString;
    encoding: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    voice: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodString>;
    extra: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    transcript: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "session.create";
    encoding: string;
    sample_rate: string;
    extra: Record<string, unknown>;
    language?: string | undefined;
    transcript?: string | undefined;
    model?: string | undefined;
    voice?: string | undefined;
}, {
    type: "session.create";
    encoding: string;
    sample_rate: string;
    extra: Record<string, unknown>;
    language?: string | undefined;
    transcript?: string | undefined;
    model?: string | undefined;
    voice?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"input_transcript">;
    transcript: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "input_transcript";
    transcript: string;
}, {
    type: "input_transcript";
    transcript: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"session.flush">;
}, "strip", z.ZodTypeAny, {
    type: "session.flush";
}, {
    type: "session.flush";
}>, z.ZodObject<{
    type: z.ZodLiteral<"session.close">;
}, "strip", z.ZodTypeAny, {
    type: "session.close";
}, {
    type: "session.close";
}>]>;
export declare const ttsServerEventSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"session.created">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "session.created";
    session_id: string;
}, {
    type: "session.created";
    session_id: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"output_audio">;
    audio: z.ZodString;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "output_audio";
    audio: string;
    session_id: string;
}, {
    type: "output_audio";
    audio: string;
    session_id: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"done">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "done";
    session_id: string;
}, {
    type: "done";
    session_id: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"session.closed">;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "session.closed";
    session_id: string;
}, {
    type: "session.closed";
    session_id: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    message: z.ZodString;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "error";
    session_id: string;
}, {
    message: string;
    type: "error";
    session_id: string;
}>]>;
export type TtsSessionCreateEvent = z.infer<typeof ttsSessionCreateEventSchema>;
export type TtsInputTranscriptEvent = z.infer<typeof ttsInputTranscriptEventSchema>;
export type TtsSessionFlushEvent = z.infer<typeof ttsSessionFlushEventSchema>;
export type TtsSessionCloseEvent = z.infer<typeof ttsSessionCloseEventSchema>;
export type TtsSessionCreatedEvent = z.infer<typeof ttsSessionCreatedEventSchema>;
export type TtsOutputAudioEvent = z.infer<typeof ttsOutputAudioEventSchema>;
export type TtsDoneEvent = z.infer<typeof ttsDoneEventSchema>;
export type TtsSessionClosedEvent = z.infer<typeof ttsSessionClosedEventSchema>;
export type TtsErrorEvent = z.infer<typeof ttsErrorEventSchema>;
export type TtsClientEvent = z.infer<typeof ttsClientEventSchema>;
export type TtsServerEvent = z.infer<typeof ttsServerEventSchema>;
//# sourceMappingURL=api_protos.d.ts.map