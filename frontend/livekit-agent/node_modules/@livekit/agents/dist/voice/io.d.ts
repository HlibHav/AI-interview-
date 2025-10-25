/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import { EventEmitter } from 'node:events';
import type { ReadableStream } from 'node:stream/web';
import type { ChatContext } from '../llm/chat_context.js';
import type { ChatChunk } from '../llm/llm.js';
import type { ToolContext } from '../llm/tool_context.js';
import { DeferredReadableStream } from '../stream/deferred_stream.js';
import type { SpeechEvent } from '../stt/stt.js';
import type { ModelSettings } from './agent.js';
export type STTNode = (audio: ReadableStream<AudioFrame>, modelSettings: ModelSettings) => Promise<ReadableStream<SpeechEvent | string> | null>;
export type LLMNode = (chatCtx: ChatContext, toolCtx: ToolContext, modelSettings: ModelSettings) => Promise<ReadableStream<ChatChunk | string> | null>;
export type TTSNode = (text: ReadableStream<string>, modelSettings: ModelSettings) => Promise<ReadableStream<AudioFrame> | null>;
export declare abstract class AudioInput {
    protected deferredStream: DeferredReadableStream<AudioFrame>;
    get stream(): ReadableStream<AudioFrame>;
    onAttached(): void;
    onDetached(): void;
}
export declare abstract class AudioOutput extends EventEmitter {
    sampleRate?: number | undefined;
    protected readonly nextInChain?: AudioOutput | undefined;
    static readonly EVENT_PLAYBACK_FINISHED = "playbackFinished";
    private playbackFinishedFuture;
    private _capturing;
    private playbackFinishedCount;
    private playbackSegmentsCount;
    private lastPlaybackEvent;
    protected logger: import("pino").Logger;
    constructor(sampleRate?: number | undefined, nextInChain?: AudioOutput | undefined);
    /**
     * Capture an audio frame for playback, frames can be pushed faster than real-time
     */
    captureFrame(_frame: AudioFrame): Promise<void>;
    /**
     * Wait for the past audio segments to finish playing out.
     *
     * @returns The event that was emitted when the audio finished playing out (only the last segment information)
     */
    waitForPlayout(): Promise<PlaybackFinishedEvent>;
    /**
     * Developers building audio sinks must call this method when a playback/segment is finished.
     * Segments are segmented by calls to flush() or clearBuffer()
     */
    onPlaybackFinished(options: PlaybackFinishedEvent): void;
    flush(): void;
    /**
     * Clear the buffer, stopping playback immediately
     */
    abstract clearBuffer(): void;
    onAttached(): void;
    onDetached(): void;
}
export interface PlaybackFinishedEvent {
    playbackPosition: number;
    interrupted: boolean;
    synchronizedTranscript?: string;
}
export declare abstract class TextOutput {
    protected readonly nextInChain?: TextOutput | undefined;
    constructor(nextInChain?: TextOutput | undefined);
    /**
     * Capture a text segment (Used by the output of LLM nodes)
     */
    abstract captureText(text: string): Promise<void>;
    /**
     * Mark the current text segment as complete (e.g LLM generation is complete)
     */
    abstract flush(): void;
    onAttached(): void;
    onDetached(): void;
}
export declare class AgentInput {
    private readonly audioChanged;
    private _audioStream;
    private _audioEnabled;
    constructor(audioChanged: () => void);
    setAudioEnabled(enable: boolean): void;
    get audioEnabled(): boolean;
    get audio(): AudioInput | null;
    set audio(stream: AudioInput | null);
}
export declare class AgentOutput {
    private readonly audioChanged;
    private readonly transcriptionChanged;
    private _audioSink;
    private _transcriptionSink;
    private _audioEnabled;
    private _transcriptionEnabled;
    constructor(audioChanged: () => void, transcriptionChanged: () => void);
    setAudioEnabled(enabled: boolean): void;
    setTranscriptionEnabled(enabled: boolean): void;
    get audioEnabled(): boolean;
    get transcriptionEnabled(): boolean;
    get audio(): AudioOutput | null;
    set audio(sink: AudioOutput | null);
    get transcription(): TextOutput | null;
    set transcription(sink: TextOutput | null);
}
//# sourceMappingURL=io.d.ts.map