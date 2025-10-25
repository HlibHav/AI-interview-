/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { ReadableStream, ReadableStreamDefaultReader, WritableStreamDefaultWriter } from 'node:stream/web';
import type { VADMetrics } from './metrics/base.js';
import { IdentityTransform } from './stream/identity_transform.js';
export declare enum VADEventType {
    START_OF_SPEECH = 0,
    INFERENCE_DONE = 1,
    END_OF_SPEECH = 2,
    METRICS_COLLECTED = 3
}
export interface VADEvent {
    /** Type of the VAD event (e.g., start of speech, end of speech, inference done). */
    type: VADEventType;
    /**
     * Index of the audio sample where the event occurred, relative to the inference sample rate.
     */
    samplesIndex: number;
    /** Timestamp when the event was fired. */
    timestamp: number;
    /** Duration of the speech segment. */
    speechDuration: number;
    /** Duration of the silence segment. */
    silenceDuration: number;
    /**
     * List of audio frames associated with the speech.
     *
     * @remarks
     * - For `start_of_speech` events, this contains the audio chunks that triggered the detection.
     * - For `inference_done` events, this contains the audio chunks that were processed.
     * - For `end_of_speech` events, this contains the complete user speech.
     */
    frames: AudioFrame[];
    /** Probability that speech is present (only for `INFERENCE_DONE` events). */
    probability: number;
    /** Time taken to perform the inference, in seconds (only for `INFERENCE_DONE` events). */
    inferenceDuration: number;
    /** Indicates whether speech was detected in the frames. */
    speaking: boolean;
    /** Threshold used to detect silence. */
    rawAccumulatedSilence: number;
    /** Threshold used to detect speech. */
    rawAccumulatedSpeech: number;
}
export interface VADCapabilities {
    updateInterval: number;
}
export type VADCallbacks = {
    ['metrics_collected']: (metrics: VADMetrics) => void;
};
declare const VAD_base: new () => TypedEmitter<VADCallbacks>;
export declare abstract class VAD extends VAD_base {
    #private;
    abstract label: string;
    constructor(capabilities: VADCapabilities);
    get capabilities(): VADCapabilities;
    /**
     * Returns a {@link VADStream} that can be used to push audio frames and receive VAD events.
     */
    abstract stream(): VADStream;
}
export declare abstract class VADStream implements AsyncIterableIterator<VADEvent> {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    protected input: IdentityTransform<AudioFrame | typeof VADStream.FLUSH_SENTINEL>;
    protected output: IdentityTransform<VADEvent>;
    protected inputWriter: WritableStreamDefaultWriter<AudioFrame | typeof VADStream.FLUSH_SENTINEL>;
    protected inputReader: ReadableStreamDefaultReader<AudioFrame | typeof VADStream.FLUSH_SENTINEL>;
    protected outputWriter: WritableStreamDefaultWriter<VADEvent>;
    protected outputReader: ReadableStreamDefaultReader<VADEvent>;
    protected closed: boolean;
    protected inputClosed: boolean;
    private logger;
    private deferredInputStream;
    private metricsStream;
    constructor(vad: VAD);
    /**
     * Reads from the deferred input stream and forwards chunks to the input writer.
     *
     * Note: we can't just do this.deferredInputStream.stream.pipeTo(this.input.writable)
     * because the inputWriter locks the this.input.writable stream. All writes must go through
     * the inputWriter.
     */
    private pumpDeferredStream;
    protected monitorMetrics(): Promise<void>;
    updateInputStream(audioStream: ReadableStream<AudioFrame>): void;
    detachInputStream(): void;
    /** @deprecated Use `updateInputStream` instead */
    pushFrame(frame: AudioFrame): void;
    flush(): void;
    endInput(): void;
    next(): Promise<IteratorResult<VADEvent>>;
    close(): void;
    [Symbol.asyncIterator](): VADStream;
}
export {};
//# sourceMappingURL=vad.d.ts.map