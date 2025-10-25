/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import type { ReadableStream } from 'node:stream/web';
import type { SentenceTokenizer } from '../../tokenize/index.js';
import { AudioOutput, type PlaybackFinishedEvent, TextOutput } from '../io.js';
interface TextSyncOptions {
    speed: number;
    hyphenateWord: (word: string) => string[];
    splitWords: (words: string) => [string, number, number][];
    sentenceTokenizer: SentenceTokenizer;
}
declare class SegmentSynchronizerImpl {
    private readonly options;
    private readonly nextInChain;
    private textData;
    private audioData;
    private speed;
    private outputStream;
    private outputStreamWriter;
    private captureTask;
    private startWallTime?;
    private startFuture;
    private closedFuture;
    private playbackCompleted;
    private logger;
    constructor(options: TextSyncOptions, nextInChain: TextOutput);
    get closed(): boolean;
    get audioInputEnded(): boolean;
    get textInputEnded(): boolean;
    get readable(): ReadableStream<string>;
    pushAudio(frame: AudioFrame): void;
    endAudioInput(): void;
    pushText(text: string): void;
    endTextInput(): void;
    markPlaybackFinished(_playbackPosition: number, interrupted: boolean): void;
    get synchronizedTranscript(): string;
    private captureTaskImpl;
    private mainTask;
    private sleepIfNotClosed;
    close(): Promise<void>;
}
export interface TranscriptionSynchronizerOptions {
    speed: number;
    hyphenateWord: (word: string) => string[];
    splitWords: (words: string) => [string, number, number][];
    sentenceTokenizer: SentenceTokenizer;
}
export declare const defaultTextSyncOptions: TranscriptionSynchronizerOptions;
export declare class TranscriptionSynchronizer {
    readonly audioOutput: SyncedAudioOutput;
    readonly textOutput: SyncedTextOutput;
    private options;
    private rotateSegmentTask;
    private _enabled;
    private closed;
    /** @internal */
    _impl: SegmentSynchronizerImpl;
    private logger;
    constructor(nextInChainAudio: AudioOutput, nextInChainText: TextOutput, options?: TranscriptionSynchronizerOptions);
    get enabled(): boolean;
    set enabled(enabled: boolean);
    rotateSegment(): void;
    close(): Promise<void>;
    barrier(): Promise<void>;
    private rotateSegmentTaskImpl;
}
declare class SyncedAudioOutput extends AudioOutput {
    synchronizer: TranscriptionSynchronizer;
    private nextInChainAudio;
    private pushedDuration;
    constructor(synchronizer: TranscriptionSynchronizer, nextInChainAudio: AudioOutput);
    captureFrame(frame: AudioFrame): Promise<void>;
    flush(): void;
    clearBuffer(): void;
    onPlaybackFinished(ev: PlaybackFinishedEvent): void;
}
declare class SyncedTextOutput extends TextOutput {
    private readonly synchronizer;
    readonly nextInChain: TextOutput;
    private capturing;
    private logger;
    constructor(synchronizer: TranscriptionSynchronizer, nextInChain: TextOutput);
    captureText(text: string): Promise<void>;
    flush(): void;
}
export {};
//# sourceMappingURL=synchronizer.d.ts.map