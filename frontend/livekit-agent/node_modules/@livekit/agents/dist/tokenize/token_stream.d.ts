import { AsyncIterableQueue } from '../utils.js';
import type { TokenData } from './tokenizer.js';
import { SentenceStream, WordStream } from './tokenizer.js';
type TokenizeFunc = (x: string) => string[] | [string, number, number][];
export declare class BufferedTokenStream implements AsyncIterableIterator<TokenData> {
    #private;
    protected queue: AsyncIterableQueue<TokenData>;
    protected closed: boolean;
    constructor(func: TokenizeFunc, minTokenLength: number, minContextLength: number);
    /** Push a string of text into the token stream */
    pushText(text: string): void;
    /** Flush the stream, causing it to process all pending text */
    flush(): void;
    /** Mark the input as ended and forbid additional pushes */
    endInput(): void;
    next(): Promise<IteratorResult<TokenData>>;
    /** Close both the input and output of the token stream */
    close(): void;
    [Symbol.asyncIterator](): BufferedTokenStream;
}
export declare class BufferedSentenceStream extends SentenceStream {
    #private;
    constructor(func: TokenizeFunc, minTokenLength: number, minContextLength: number);
    pushText(text: string): void;
    flush(): void;
    close(): void;
    endInput(): void;
    next(): Promise<IteratorResult<TokenData>>;
}
export declare class BufferedWordStream extends WordStream {
    #private;
    constructor(func: TokenizeFunc, minTokenLength: number, minContextLength: number);
    pushText(text: string): void;
    flush(): void;
    endInput(): void;
    close(): void;
    next(): Promise<IteratorResult<TokenData>>;
}
export {};
//# sourceMappingURL=token_stream.d.ts.map