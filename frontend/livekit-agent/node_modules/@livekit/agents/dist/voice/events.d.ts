import type { ChatMessage, FunctionCall, FunctionCallOutput, RealtimeModelError } from '../llm/index.js';
import type { LLM, RealtimeModel } from '../llm/index.js';
import type { LLMError } from '../llm/llm.js';
import type { AgentMetrics } from '../metrics/base.js';
import type { STT } from '../stt/index.js';
import type { STTError } from '../stt/stt.js';
import type { TTS } from '../tts/index.js';
import type { TTSError } from '../tts/tts.js';
import type { SpeechHandle } from './speech_handle.js';
export declare enum AgentSessionEventTypes {
    UserInputTranscribed = "user_input_transcribed",
    AgentStateChanged = "agent_state_changed",
    UserStateChanged = "user_state_changed",
    ConversationItemAdded = "conversation_item_added",
    FunctionToolsExecuted = "function_tools_executed",
    MetricsCollected = "metrics_collected",
    SpeechCreated = "speech_created",
    Error = "error",
    Close = "close"
}
export type UserState = 'speaking' | 'listening' | 'away';
export type AgentState = 'initializing' | 'idle' | 'listening' | 'thinking' | 'speaking';
export declare enum CloseReason {
    ERROR = "error",
    JOB_SHUTDOWN = "job_shutdown",
    PARTICIPANT_DISCONNECTED = "participant_disconnected",
    USER_INITIATED = "user_initiated"
}
export type SpeechSource = 'say' | 'generate_reply' | 'tool_response';
export type UserStateChangedEvent = {
    type: 'user_state_changed';
    oldState: UserState;
    newState: UserState;
    createdAt: number;
};
export declare const createUserStateChangedEvent: (oldState: UserState, newState: UserState, createdAt?: number) => UserStateChangedEvent;
export type AgentStateChangedEvent = {
    type: 'agent_state_changed';
    oldState: AgentState;
    newState: AgentState;
    createdAt: number;
};
export declare const createAgentStateChangedEvent: (oldState: AgentState, newState: AgentState, createdAt?: number) => AgentStateChangedEvent;
export type UserInputTranscribedEvent = {
    type: 'user_input_transcribed';
    transcript: string;
    isFinal: boolean;
    /** Not supported yet. Always null by default. */
    speakerId: string | null;
    createdAt: number;
    language: string | null;
};
export declare const createUserInputTranscribedEvent: ({ transcript, isFinal, speakerId, language, createdAt, }: {
    transcript: string;
    isFinal: boolean;
    speakerId?: string | null;
    language?: string | null;
    createdAt?: number;
}) => UserInputTranscribedEvent;
export type MetricsCollectedEvent = {
    type: 'metrics_collected';
    metrics: AgentMetrics;
    createdAt: number;
};
export declare const createMetricsCollectedEvent: ({ metrics, createdAt, }: {
    metrics: AgentMetrics;
    createdAt?: number;
}) => MetricsCollectedEvent;
export type ConversationItemAddedEvent = {
    type: 'conversation_item_added';
    item: ChatMessage;
    createdAt: number;
};
export declare const createConversationItemAddedEvent: (item: ChatMessage, createdAt?: number) => ConversationItemAddedEvent;
export type FunctionToolsExecutedEvent = {
    type: 'function_tools_executed';
    functionCalls: FunctionCall[];
    functionCallOutputs: FunctionCallOutput[];
    createdAt: number;
};
export declare const createFunctionToolsExecutedEvent: ({ functionCalls, functionCallOutputs, createdAt, }: {
    functionCalls: FunctionCall[];
    functionCallOutputs: FunctionCallOutput[];
    createdAt?: number;
}) => FunctionToolsExecutedEvent;
export declare const zipFunctionCallsAndOutputs: (event: FunctionToolsExecutedEvent) => Array<[FunctionCall, FunctionCallOutput]>;
export type SpeechCreatedEvent = {
    type: 'speech_created';
    /**
     * True if the speech was created using public methods like `say` or `generate_reply`
     */
    userInitiated: boolean;
    /**
     * Source indicating how the speech handle was created
     */
    source: SpeechSource;
    /**
     * The speech handle that was created
     */
    speechHandle: SpeechHandle;
    /**
     * The timestamp when the speech handle was created
     */
    createdAt: number;
};
export declare const createSpeechCreatedEvent: ({ userInitiated, source, speechHandle, createdAt, }: {
    userInitiated: boolean;
    source: SpeechSource;
    speechHandle: SpeechHandle;
    createdAt?: number;
}) => SpeechCreatedEvent;
export type ErrorEvent = {
    type: 'error';
    error: RealtimeModelError | STTError | TTSError | LLMError | unknown;
    source: LLM | STT | TTS | RealtimeModel | unknown;
    createdAt: number;
};
export declare const createErrorEvent: (error: RealtimeModelError | STTError | TTSError | LLMError | unknown, source: LLM | STT | TTS | RealtimeModel | unknown, createdAt?: number) => ErrorEvent;
export type CloseEvent = {
    type: 'close';
    error: RealtimeModelError | STTError | TTSError | LLMError | null;
    reason: CloseReason;
    createdAt: number;
};
export declare const createCloseEvent: (reason: CloseReason, error?: RealtimeModelError | STTError | TTSError | LLMError | null, createdAt?: number) => CloseEvent;
export type AgentEvent = UserInputTranscribedEvent | UserStateChangedEvent | AgentStateChangedEvent | MetricsCollectedEvent | ConversationItemAddedEvent | FunctionToolsExecutedEvent | SpeechCreatedEvent | ErrorEvent | CloseEvent;
//# sourceMappingURL=events.d.ts.map