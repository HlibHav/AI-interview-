/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame, Room } from '@livekit/rtc-node';
import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { ReadableStream } from 'node:stream/web';
import { type LLMModels, type STTModelString, type TTSModelString } from '../inference/index.js';
import { ChatContext, ChatMessage } from '../llm/chat_context.js';
import type { LLM, RealtimeModel, RealtimeModelError, ToolChoice } from '../llm/index.js';
import type { LLMError } from '../llm/llm.js';
import type { STT } from '../stt/index.js';
import type { STTError } from '../stt/stt.js';
import type { TTS, TTSError } from '../tts/tts.js';
import type { VAD } from '../vad.js';
import type { Agent } from './agent.js';
import type { _TurnDetector } from './audio_recognition.js';
import { AgentSessionEventTypes, type AgentState, type AgentStateChangedEvent, type CloseEvent, CloseReason, type ConversationItemAddedEvent, type ErrorEvent, type FunctionToolsExecutedEvent, type MetricsCollectedEvent, type SpeechCreatedEvent, type UserInputTranscribedEvent, type UserState, type UserStateChangedEvent } from './events.js';
import { AgentInput, AgentOutput } from './io.js';
import { type RoomInputOptions, type RoomOutputOptions } from './room_io/index.js';
import type { UnknownUserData } from './run_context.js';
import type { SpeechHandle } from './speech_handle.js';
export interface VoiceOptions {
    allowInterruptions: boolean;
    discardAudioIfUninterruptible: boolean;
    minInterruptionDuration: number;
    minInterruptionWords: number;
    minEndpointingDelay: number;
    maxEndpointingDelay: number;
    maxToolSteps: number;
}
export type TurnDetectionMode = 'stt' | 'vad' | 'realtime_llm' | 'manual' | _TurnDetector;
export type AgentSessionCallbacks = {
    [AgentSessionEventTypes.UserInputTranscribed]: (ev: UserInputTranscribedEvent) => void;
    [AgentSessionEventTypes.AgentStateChanged]: (ev: AgentStateChangedEvent) => void;
    [AgentSessionEventTypes.UserStateChanged]: (ev: UserStateChangedEvent) => void;
    [AgentSessionEventTypes.ConversationItemAdded]: (ev: ConversationItemAddedEvent) => void;
    [AgentSessionEventTypes.FunctionToolsExecuted]: (ev: FunctionToolsExecutedEvent) => void;
    [AgentSessionEventTypes.MetricsCollected]: (ev: MetricsCollectedEvent) => void;
    [AgentSessionEventTypes.SpeechCreated]: (ev: SpeechCreatedEvent) => void;
    [AgentSessionEventTypes.Error]: (ev: ErrorEvent) => void;
    [AgentSessionEventTypes.Close]: (ev: CloseEvent) => void;
};
export type AgentSessionOptions<UserData = UnknownUserData> = {
    turnDetection?: TurnDetectionMode;
    stt?: STT | STTModelString;
    vad?: VAD;
    llm?: LLM | RealtimeModel | LLMModels;
    tts?: TTS | TTSModelString;
    userData?: UserData;
    voiceOptions?: Partial<VoiceOptions>;
};
declare const AgentSession_base: new () => TypedEmitter<AgentSessionCallbacks>;
export declare class AgentSession<UserData = UnknownUserData> extends AgentSession_base {
    vad?: VAD;
    stt?: STT;
    llm?: LLM | RealtimeModel;
    tts?: TTS;
    turnDetection?: TurnDetectionMode;
    readonly options: VoiceOptions;
    private agent?;
    private activity?;
    private nextActivity?;
    private started;
    private userState;
    private roomIO?;
    private logger;
    private _chatCtx;
    private _userData;
    private _agentState;
    private _input;
    private _output;
    private closingTask;
    constructor(opts: AgentSessionOptions<UserData>);
    get input(): AgentInput;
    get output(): AgentOutput;
    get userData(): UserData;
    get history(): ChatContext;
    set userData(value: UserData);
    start({ agent, room, inputOptions, outputOptions, }: {
        agent: Agent;
        room: Room;
        inputOptions?: Partial<RoomInputOptions>;
        outputOptions?: Partial<RoomOutputOptions>;
    }): Promise<void>;
    updateAgent(agent: Agent): void;
    commitUserTurn(): void;
    clearUserTurn(): void;
    say(text: string | ReadableStream<string>, options?: {
        audio?: ReadableStream<AudioFrame>;
        allowInterruptions?: boolean;
        addToChatCtx?: boolean;
    }): SpeechHandle;
    interrupt(): import("../utils.js").Future<void>;
    generateReply(options?: {
        userInput?: string;
        instructions?: string;
        toolChoice?: ToolChoice;
        allowInterruptions?: boolean;
    }): SpeechHandle;
    private updateActivity;
    get chatCtx(): ChatContext;
    get agentState(): AgentState;
    get currentAgent(): Agent;
    close(): Promise<void>;
    /** @internal */
    _closeSoon({ reason, drain, error, }: {
        reason: CloseReason;
        drain?: boolean;
        error?: RealtimeModelError | STTError | TTSError | LLMError | null;
    }): void;
    /** @internal */
    _onError(error: RealtimeModelError | STTError | TTSError | LLMError): void;
    /** @internal */
    _conversationItemAdded(item: ChatMessage): void;
    /** @internal */
    _updateAgentState(state: AgentState): void;
    /** @internal */
    _updateUserState(state: UserState): void;
    private onAudioInputChanged;
    private onAudioOutputChanged;
    private onTextOutputChanged;
    private closeImpl;
}
export {};
//# sourceMappingURL=agent_session.d.ts.map