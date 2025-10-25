/// <reference types="node" resolution-mode="require"/>
/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import { AsyncLocalStorage } from 'node:async_hooks';
import { ReadableStream } from 'node:stream/web';
import { type LLMModels, type STTModelString, type TTSModelString } from '../inference/index.js';
import { ReadonlyChatContext } from '../llm/chat_context.js';
import type { ChatMessage, FunctionCall, RealtimeModel } from '../llm/index.js';
import { type ChatChunk, ChatContext, LLM, type ToolChoice, type ToolContext } from '../llm/index.js';
import type { STT, SpeechEvent } from '../stt/index.js';
import type { TTS } from '../tts/index.js';
import type { VAD } from '../vad.js';
import type { AgentActivity } from './agent_activity.js';
import type { AgentSession, TurnDetectionMode } from './agent_session.js';
export declare const asyncLocalStorage: AsyncLocalStorage<{
    functionCall?: FunctionCall | undefined;
}>;
export declare const STOP_RESPONSE_SYMBOL: unique symbol;
export declare class StopResponse extends Error {
    constructor();
}
export declare function isStopResponse(value: unknown): value is StopResponse;
export interface ModelSettings {
    /** The tool choice to use when calling the LLM. */
    toolChoice?: ToolChoice;
}
export interface AgentOptions<UserData> {
    instructions: string;
    chatCtx?: ChatContext;
    tools?: ToolContext<UserData>;
    turnDetection?: TurnDetectionMode;
    stt?: STT | STTModelString;
    vad?: VAD;
    llm?: LLM | RealtimeModel | LLMModels;
    tts?: TTS | TTSModelString;
    allowInterruptions?: boolean;
    minConsecutiveSpeechDelay?: number;
}
export declare class Agent<UserData = any> {
    private turnDetection?;
    private _stt?;
    private _vad?;
    private _llm?;
    private _tts?;
    /** @internal */
    _agentActivity?: AgentActivity;
    /** @internal */
    _chatCtx: ChatContext;
    /** @internal */
    _instructions: string;
    /** @internal */
    _tools?: ToolContext<UserData>;
    constructor({ instructions, chatCtx, tools, turnDetection, stt, vad, llm, tts, }: AgentOptions<UserData>);
    get vad(): VAD | undefined;
    get stt(): STT | undefined;
    get llm(): LLM | RealtimeModel | undefined;
    get tts(): TTS | undefined;
    get chatCtx(): ReadonlyChatContext;
    get instructions(): string;
    get toolCtx(): ToolContext<UserData>;
    get session(): AgentSession<UserData>;
    onEnter(): Promise<void>;
    onExit(): Promise<void>;
    transcriptionNode(text: ReadableStream<string>, modelSettings: ModelSettings): Promise<ReadableStream<string> | null>;
    onUserTurnCompleted(_chatCtx: ChatContext, _newMessage: ChatMessage): Promise<void>;
    sttNode(audio: ReadableStream<AudioFrame>, modelSettings: ModelSettings): Promise<ReadableStream<SpeechEvent | string> | null>;
    llmNode(chatCtx: ChatContext, toolCtx: ToolContext, modelSettings: ModelSettings): Promise<ReadableStream<ChatChunk | string> | null>;
    ttsNode(text: ReadableStream<string>, modelSettings: ModelSettings): Promise<ReadableStream<AudioFrame> | null>;
    realtimeAudioOutputNode(audio: ReadableStream<AudioFrame>, modelSettings: ModelSettings): Promise<ReadableStream<AudioFrame> | null>;
    getActivityOrThrow(): AgentActivity;
    updateChatCtx(chatCtx: ChatContext): Promise<void>;
    static default: {
        sttNode(agent: Agent, audio: ReadableStream<AudioFrame>, _modelSettings: ModelSettings): Promise<ReadableStream<SpeechEvent | string> | null>;
        llmNode(agent: Agent, chatCtx: ChatContext, toolCtx: ToolContext, modelSettings: ModelSettings): Promise<ReadableStream<ChatChunk | string> | null>;
        ttsNode(agent: Agent, text: ReadableStream<string>, _modelSettings: ModelSettings): Promise<ReadableStream<AudioFrame> | null>;
        transcriptionNode(agent: Agent, text: ReadableStream<string>, _modelSettings: ModelSettings): Promise<ReadableStream<string> | null>;
        realtimeAudioOutputNode(_agent: Agent, audio: ReadableStream<AudioFrame>, _modelSettings: ModelSettings): Promise<ReadableStream<AudioFrame> | null>;
    };
}
//# sourceMappingURL=agent.d.ts.map