import { AsyncIterableQueue } from '../utils.js';
export declare const PUNCTUATIONS: string[];
export interface TokenData {
    segmentId: string;
    token: string;
}
export declare abstract class SentenceTokenizer {
    abstract tokenize(text: string, language?: string): string[];
    /**
     * Returns a {@link SentenceStream} that can be used to push strings and receive smaller segments.
     */
    abstract stream(): SentenceStream;
}
export declare abstract class SentenceStream {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    protected input: AsyncIterableQueue<string | typeof SentenceStream.FLUSH_SENTINEL>;
    protected queue: AsyncIterableQueue<TokenData>;
    get closed(): boolean;
    /** Push a string of text to the tokenizer */
    pushText(text: string): void;
    /** Flush the tokenizer, causing it to process all pending text */
    flush(): void;
    /** Mark the input as ended and forbid additional pushes */
    endInput(): void;
    next(): Promise<IteratorResult<TokenData>>;
    /** Close both the input and output of the tokenizer stream */
    close(): void;
    [Symbol.asyncIterator](): SentenceStream;
}
export declare abstract class WordTokenizer {
    abstract tokenize(text: string, language?: string): string[];
    /**
     * Returns a {@link WordStream} that can be used to push words and receive smaller segments.
     */
    abstract stream(): WordStream;
}
export declare abstract class WordStream {
    #private;
    protected static readonly FLUSH_SENTINEL: unique symbol;
    protected input: AsyncIterableQueue<string | typeof WordStream.FLUSH_SENTINEL>;
    protected queue: AsyncIterableQueue<TokenData>;
    get closed(): boolean;
    /** Push a string of text to the tokenizer */
    pushText(text: string): void;
    /** Flush the tokenizer, causing it to process all pending text */
    flush(): void;
    /** Mark the input as ended and forbid additional pushes */
    endInput(): void;
    next(): Promise<IteratorResult<TokenData>>;
    /** Close both the input and output of the tokenizer stream */
    close(): void;
    [Symbol.asyncIterator](): WordStream;
}
//# sourceMappingURL=tokenizer.d.ts.map