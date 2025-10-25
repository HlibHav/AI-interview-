/// <reference types="node" resolution-mode="require"/>
import type { ReadableStream } from 'node:stream/web';
/**
 * Check if error is related to reader.read after release lock
 *
 * Invalid state: Releasing reader
 * Invalid state: The reader is not attached to a stream
 */
export declare function isStreamReaderReleaseError(e: unknown): boolean;
export declare class DeferredReadableStream<T> {
    private transform;
    private writer;
    private sourceReader?;
    constructor();
    get stream(): ReadableStream<T>;
    get isSourceSet(): boolean;
    /**
     * Call once the actual source is ready.
     */
    setSource(source: ReadableStream<T>): void;
    private pump;
    /**
     * Detach the source stream and clean up resources.
     */
    detachSource(): Promise<void>;
}
//# sourceMappingURL=deferred_stream.d.ts.map