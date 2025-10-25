/// <reference types="node" resolution-mode="require"/>
import type { ReadableStream } from 'node:stream/web';
export interface StreamChannel<T> {
    write(chunk: T): Promise<void>;
    close(): Promise<void>;
    stream(): ReadableStream<T>;
}
export declare function createStreamChannel<T>(): StreamChannel<T>;
//# sourceMappingURL=stream_channel.d.ts.map