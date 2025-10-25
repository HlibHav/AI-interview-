import * as tokenizer from '../tokenizer.js';
import { splitWords } from './word.js';
interface TokenizerOptions {
    language: string;
    minSentenceLength: number;
    streamContextLength: number;
    retainFormat: boolean;
}
export declare class SentenceTokenizer extends tokenizer.SentenceTokenizer {
    #private;
    constructor(options?: Partial<TokenizerOptions>);
    tokenize(text: string, language?: string): string[];
    stream(language?: string): tokenizer.SentenceStream;
}
export declare class WordTokenizer extends tokenizer.WordTokenizer {
    #private;
    constructor(ignorePunctuation?: boolean);
    tokenize(text: string, language?: string): string[];
    stream(language?: string): tokenizer.WordStream;
}
export declare const hyphenateWord: (word: string) => string[];
export { splitWords };
export declare const tokenizeParagraphs: (text: string) => string[];
//# sourceMappingURL=basic.d.ts.map