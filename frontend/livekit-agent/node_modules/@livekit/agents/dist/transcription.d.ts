import { TranscriptionSegment } from '@livekit/protocol';
import { AudioFrame } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { SentenceTokenizer } from './tokenize/tokenizer.js';
export interface TextSyncOptions {
    language: string;
    speed: number;
    newSentenceDelay: number;
    sentenceTokenizer: SentenceTokenizer;
    hyphenateWord: (word: string) => string[];
    splitWords: (words: string) => [string, number, number][];
}
export declare const defaultTextSyncOptions: TextSyncOptions;
type SyncCallbacks = {
    textUpdated: (text: TranscriptionSegment) => void;
};
declare const TextAudioSynchronizer_base: new () => TypedEmitter<SyncCallbacks>;
export declare class TextAudioSynchronizer extends TextAudioSynchronizer_base {
    #private;
    constructor(opts: TextSyncOptions);
    pushAudio(frame: AudioFrame): void;
    pushText(text: string): void;
    markAudioSegmentEnd(): void;
    markTextSegmentEnd(): void;
    segmentPlayoutStarted(): void;
    segmentPlayoutFinished(): void;
    get playedText(): string;
    close(interrupt: boolean): Promise<void>;
}
export {};
//# sourceMappingURL=transcription.d.ts.map