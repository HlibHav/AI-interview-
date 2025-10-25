/// <reference types="node" resolution-mode="require"/>
import { AudioFrame } from '@livekit/rtc-node';
import { ReadableStream } from 'node:stream/web';
import { type ChatContext } from '../llm/chat_context.js';
import { type SpeechEvent } from '../stt/stt.js';
import { type VAD, type VADEvent } from '../vad.js';
import type { TurnDetectionMode } from './agent_session.js';
import type { STTNode } from './io.js';
export interface EndOfTurnInfo {
    newTranscript: string;
    transcriptionDelay: number;
    endOfUtteranceDelay: number;
}
export interface RecognitionHooks {
    onStartOfSpeech: (ev: VADEvent) => void;
    onVADInferenceDone: (ev: VADEvent) => void;
    onEndOfSpeech: (ev: VADEvent) => void;
    onInterimTranscript: (ev: SpeechEvent) => void;
    onFinalTranscript: (ev: SpeechEvent) => void;
    onEndOfTurn: (info: EndOfTurnInfo) => Promise<boolean>;
    retrieveChatCtx: () => ChatContext;
}
export interface _TurnDetector {
    unlikelyThreshold: (language?: string) => Promise<number | undefined>;
    supportsLanguage: (language?: string) => Promise<boolean>;
    predictEndOfTurn(chatCtx: ChatContext): Promise<number>;
}
export interface AudioRecognitionOptions {
    recognitionHooks: RecognitionHooks;
    stt?: STTNode;
    vad?: VAD;
    turnDetector?: _TurnDetector;
    turnDetectionMode?: Exclude<TurnDetectionMode, _TurnDetector>;
    minEndpointingDelay: number;
    maxEndpointingDelay: number;
}
export declare class AudioRecognition {
    private hooks;
    private stt?;
    private vad?;
    private turnDetector?;
    private turnDetectionMode?;
    private minEndpointingDelay;
    private maxEndpointingDelay;
    private lastLanguage?;
    private deferredInputStream;
    private logger;
    private lastFinalTranscriptTime;
    private audioTranscript;
    private audioInterimTranscript;
    private lastSpeakingTime;
    private userTurnCommitted;
    private speaking;
    private sampleRate?;
    private vadInputStream;
    private sttInputStream;
    private silenceAudioTransform;
    private silenceAudioWriter;
    private bounceEOUTask?;
    private commitUserTurnTask?;
    private vadTask?;
    private sttTask?;
    constructor(opts: AudioRecognitionOptions);
    /**
     * Current transcript of the user's speech, including interim transcript if available.
     */
    get currentTranscript(): string;
    start(): Promise<void>;
    private onSTTEvent;
    private runEOUDetection;
    private createSttTask;
    private createVadTask;
    setInputAudioStream(audioStream: ReadableStream<AudioFrame>): void;
    detachInputAudioStream(): void;
    clearUserTurn(): void;
    commitUserTurn(audioDetached: boolean): void;
    close(): Promise<void>;
    private get vadBaseTurnDetection();
}
//# sourceMappingURL=audio_recognition.d.ts.map