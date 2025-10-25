/// <reference types="node" resolution-mode="require"/>
import { type AudioFrame, AudioResampler } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { ReadableStream } from 'node:stream/web';
import type { STTMetrics } from '../metrics/base.js';
import { type APIConnectOptions } from '../types.js';
import type { AudioBuffer } from '../utils.js';
import { AsyncIterableQueue } from '../utils.js';
/** Indicates start/middle/end of speech */
export declare enum SpeechEventType {
    /**
     * Indicate the start of speech.
     * If the STT doesn't support this event, this will be emitted at the same time
     * as the first INTERIM_TRANSCRIPT.
     */
    START_OF_SPEECH = 0,
    /**
     * Interim transcript, useful for real-time transcription.
     */
    INTERIM_TRANSCRIPT = 1,
    /**
     * Final transcript, emitted when the STT is confident enough that a certain
     * portion of the speech will not change.
     */
    FINAL_TRANSCRIPT = 2,
    /**
     * Indicate the end of speech, emitted when the user stops speaking.
     * The first alternative is a combination of all the previous FINAL_TRANSCRIPT events.
     */
    END_OF_SPEECH = 3,
    /** Usage event, emitted periodically to indicate usage metrics. */
    RECOGNITION_USAGE = 4
}
/** SpeechData contains metadata about this {@link SpeechEvent}. */
export interface SpeechData {
    language: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
}
export interface RecognitionUsage {
    audioDuration: number;
}
/** SpeechEvent is a packet of speech-to-text data. */
export interface SpeechEvent {
    type: SpeechEventType;
    alternatives?: [SpeechData, ...SpeechData[]];
    requestId?: string;
    recognitionUsage?: RecognitionUsage;
}
/**
 * Describes the capabilities of the STT provider.
 *
 * @remarks
 * At present, the framework only supports providers that have a streaming endpoint.
 */
export interface STTCapabilities {
    streaming: boolean;
    interimResults: boolean;
}
export interface STTError {
    type: 'stt_error';
    timestamp: number;
    label: string;
    error: Error;
    recoverable: boolean;
}
export type STTCallbacks = {
    ['metrics_collected']: (metrics: STTMetrics) => void;
    ['error']: (error: STTError) => void;
};
declare const STT_base: new () => TypedEmitter<STTCallbacks>;
/**
 * An instance of a speech-to-text adapter.
 *
 * @remarks
 * This class is abstract, and as such cannot be used directly. Instead, use a provider plugin that
 * exports its own child STT class, which inherits this class's methods.
 */
export declare abstract class STT extends STT_base {
    #private;
    abstract label: string;
    constructor(capabilities: STTCapabilities);
    /** Returns this STT's capabilities */
    get capabilities(): STTCapabilities;
    /** Receives an audio buffer and returns transcription in the form of a {@link SpeechEvent} */
    recognize(frame: AudioBuffer): Promise<SpeechEvent>;
    protected abstract _recognize(frame: AudioBuffer): Promise<SpeechEvent>;
    /**
     * Returns a {@link SpeechStream} that can be used to push audio frames and receive
     * transcriptions
     */
    abstract stream(): SpeechStream;
}
/**
 * An instance of a speech-to-text stream, as an asynchronous iterable iterator.
 *
 * @example Looping through frames
 * ```ts
 * for await (const event of stream) {
 *   if (event.type === SpeechEventType.FINAL_TRANSCRIPT) {
 *     console.log(event.alternatives[0].text)
 *   }
 * }
 * ```
 *
 * @remarks
 * This class is abstract, and as such cannot be used directly. Instead, use a provider plugin that
 * exports its own child SpeechStream class, which inherits this class's methods.
 */
export declare abstract class SpeechStream implements AsyncIterableIterator<SpeechEvent> {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    protected input: AsyncIterableQueue<AudioFrame | typeof SpeechStream.FLUSH_SENTINEL>;
    protected output: AsyncIterableQueue<SpeechEvent>;
    protected queue: AsyncIterableQueue<SpeechEvent>;
    protected neededSampleRate?: number;
    protected resampler?: AudioResampler;
    abstract label: string;
    protected closed: boolean;
    private deferredInputStream;
    private logger;
    private _connOptions;
    constructor(stt: STT, sampleRate?: number, connectionOptions?: APIConnectOptions);
    private mainTask;
    private emitError;
    protected pumpInput(): Promise<void>;
    protected monitorMetrics(): Promise<void>;
    protected abstract run(): Promise<void>;
    updateInputStream(audioStream: ReadableStream<AudioFrame>): void;
    detachInputStream(): void;
    /** Push an audio frame to the STT */
    pushFrame(frame: AudioFrame): void;
    /** Flush the STT, causing it to process all pending text */
    flush(): void;
    /** Mark the input as ended and forbid additional pushes */
    endInput(): void;
    next(): Promise<IteratorResult<SpeechEvent>>;
    /** Close both the input and output of the STT stream */
    close(): void;
    [Symbol.asyncIterator](): SpeechStream;
}
export {};
//# sourceMappingURL=stt.d.ts.map