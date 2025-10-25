/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { ReadableStream } from 'node:stream/web';
import type { TTSMetrics } from '../metrics/base.js';
import { type APIConnectOptions } from '../types.js';
import { AsyncIterableQueue } from '../utils.js';
/** SynthesizedAudio is a packet of speech synthesis as returned by the TTS. */
export interface SynthesizedAudio {
    /** Request ID (one segment could be made up of multiple requests) */
    requestId: string;
    /** Segment ID, each segment is separated by a flush */
    segmentId: string;
    /** Synthesized audio frame */
    frame: AudioFrame;
    /** Current segment of the synthesized audio */
    deltaText?: string;
    /** Whether this is the last frame of the segment (streaming only) */
    final: boolean;
}
/**
 * Describes the capabilities of the TTS provider.
 *
 * @remarks
 * At present, only `streaming` is supplied to this interface, and the framework only supports
 * providers that do have a streaming endpoint.
 */
export interface TTSCapabilities {
    streaming: boolean;
}
export interface TTSError {
    type: 'tts_error';
    timestamp: number;
    label: string;
    error: Error;
    recoverable: boolean;
}
export type TTSCallbacks = {
    ['metrics_collected']: (metrics: TTSMetrics) => void;
    ['error']: (error: TTSError) => void;
};
declare const TTS_base: new () => TypedEmitter<TTSCallbacks>;
/**
 * An instance of a text-to-speech adapter.
 *
 * @remarks
 * This class is abstract, and as such cannot be used directly. Instead, use a provider plugin that
 * exports its own child TTS class, which inherits this class's methods.
 */
export declare abstract class TTS extends TTS_base {
    #private;
    abstract label: string;
    constructor(sampleRate: number, numChannels: number, capabilities: TTSCapabilities);
    /** Returns this TTS's capabilities */
    get capabilities(): TTSCapabilities;
    /** Returns the sample rate of audio frames returned by this TTS */
    get sampleRate(): number;
    /** Returns the channel count of audio frames returned by this TTS */
    get numChannels(): number;
    /**
     * Receives text and returns synthesis in the form of a {@link ChunkedStream}
     */
    abstract synthesize(text: string): ChunkedStream;
    /**
     * Returns a {@link SynthesizeStream} that can be used to push text and receive audio data
     */
    abstract stream(): SynthesizeStream;
}
/**
 * An instance of a text-to-speech stream, as an asynchronous iterable iterator.
 *
 * @example Looping through frames
 * ```ts
 * for await (const event of stream) {
 *   await source.captureFrame(event.frame);
 * }
 * ```
 *
 * @remarks
 * This class is abstract, and as such cannot be used directly. Instead, use a provider plugin that
 * exports its own child SynthesizeStream class, which inherits this class's methods.
 */
export declare abstract class SynthesizeStream implements AsyncIterableIterator<SynthesizedAudio | typeof SynthesizeStream.END_OF_STREAM> {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    static readonly END_OF_STREAM: unique symbol;
    protected input: AsyncIterableQueue<string | typeof SynthesizeStream.FLUSH_SENTINEL>;
    protected queue: AsyncIterableQueue<SynthesizedAudio | typeof SynthesizeStream.END_OF_STREAM>;
    protected output: AsyncIterableQueue<SynthesizedAudio | typeof SynthesizeStream.END_OF_STREAM>;
    protected closed: boolean;
    abstract label: string;
    private _connOptions;
    protected abortController: AbortController;
    private deferredInputStream;
    private logger;
    constructor(tts: TTS, connOptions?: APIConnectOptions);
    private mainTask;
    private emitError;
    protected pumpInput(): Promise<void>;
    protected monitorMetrics(): Promise<void>;
    protected abstract run(): Promise<void>;
    updateInputStream(text: ReadableStream<string>): void;
    /** Push a string of text to the TTS */
    /** @deprecated Use `updateInputStream` instead */
    pushText(text: string): void;
    /** Flush the TTS, causing it to process all pending text */
    flush(): void;
    /** Mark the input as ended and forbid additional pushes */
    endInput(): void;
    next(): Promise<IteratorResult<SynthesizedAudio | typeof SynthesizeStream.END_OF_STREAM>>;
    /** Close both the input and output of the TTS stream */
    close(): void;
    [Symbol.asyncIterator](): SynthesizeStream;
}
/**
 * An instance of a text-to-speech response, as an asynchronous iterable iterator.
 *
 * @example Looping through frames
 * ```ts
 * for await (const event of stream) {
 *   await source.captureFrame(event.frame);
 * }
 * ```
 *
 * @remarks
 * This class is abstract, and as such cannot be used directly. Instead, use a provider plugin that
 * exports its own child ChunkedStream class, which inherits this class's methods.
 */
export declare abstract class ChunkedStream implements AsyncIterableIterator<SynthesizedAudio> {
    #private;
    protected queue: AsyncIterableQueue<SynthesizedAudio>;
    protected output: AsyncIterableQueue<SynthesizedAudio>;
    protected closed: boolean;
    abstract label: string;
    private _connOptions;
    private logger;
    constructor(text: string, tts: TTS, connOptions?: APIConnectOptions);
    private mainTask;
    private emitError;
    protected abstract run(): Promise<void>;
    get inputText(): string;
    protected monitorMetrics(): Promise<void>;
    /** Collect every frame into one in a single call */
    collect(): Promise<AudioFrame>;
    next(): Promise<IteratorResult<SynthesizedAudio>>;
    /** Close both the input and output of the TTS stream */
    close(): void;
    [Symbol.asyncIterator](): ChunkedStream;
}
export {};
//# sourceMappingURL=tts.d.ts.map