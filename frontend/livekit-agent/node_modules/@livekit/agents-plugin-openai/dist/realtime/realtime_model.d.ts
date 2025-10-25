import { type APIConnectOptions, llm } from '@livekit/agents';
import { AudioFrame } from '@livekit/rtc-node';
import * as api_proto from './api_proto.js';
interface RealtimeOptions {
    model: api_proto.Model;
    voice: api_proto.Voice;
    temperature: number;
    toolChoice?: llm.ToolChoice;
    inputAudioTranscription?: api_proto.InputAudioTranscription | null;
    turnDetection?: api_proto.TurnDetectionType | null;
    maxResponseOutputTokens?: number | 'inf';
    speed?: number;
    apiKey?: string;
    baseURL: string;
    isAzure: boolean;
    azureDeployment?: string;
    entraToken?: string;
    apiVersion?: string;
    maxSessionDuration: number;
    connOptions: APIConnectOptions;
}
export declare class RealtimeModel extends llm.RealtimeModel {
    sampleRate: number;
    numChannels: number;
    inFrameSize: number;
    outFrameSize: number;
    _options: RealtimeOptions;
    constructor(options?: {
        model?: string;
        voice?: string;
        temperature?: number;
        toolChoice?: llm.ToolChoice;
        baseURL?: string;
        inputAudioTranscription?: api_proto.InputAudioTranscription | null;
        turnDetection?: api_proto.TurnDetectionType | null;
        speed?: number;
        azureDeployment?: string;
        apiKey?: string;
        entraToken?: string;
        apiVersion?: string;
        maxSessionDuration?: number;
        connOptions?: APIConnectOptions;
    });
    /**
     * Create a RealtimeModel instance configured for Azure OpenAI Service.
     *
     * @param azureDeployment - The name of your Azure OpenAI deployment.
     * @param azureEndpoint - The endpoint URL for your Azure OpenAI resource. If undefined, will attempt to read from the environment variable AZURE_OPENAI_ENDPOINT.
     * @param apiVersion - API version to use with Azure OpenAI Service. If undefined, will attempt to read from the environment variable OPENAI_API_VERSION.
     * @param apiKey - Azure OpenAI API key. If undefined, will attempt to read from the environment variable AZURE_OPENAI_API_KEY.
     * @param entraToken - Azure Entra authentication token. Required if not using API key authentication.
     * @param baseURL - Base URL for the API endpoint. If undefined, constructed from the azure_endpoint.
     * @param voice - Voice setting for audio outputs. Defaults to "alloy".
     * @param inputAudioTranscription - Options for transcribing input audio. Defaults to @see DEFAULT_INPUT_AUDIO_TRANSCRIPTION.
     * @param turnDetection - Options for server-based voice activity detection (VAD). Defaults to @see DEFAULT_SERVER_VAD_OPTIONS.
     * @param temperature - Sampling temperature for response generation. Defaults to @see DEFAULT_TEMPERATURE.
     * @param speed - Speed of the audio output. Defaults to 1.0.
     * @param maxResponseOutputTokens - Maximum number of tokens in the response. Defaults to @see DEFAULT_MAX_RESPONSE_OUTPUT_TOKENS.
     * @param maxSessionDuration - Maximum duration of the session in milliseconds. Defaults to @see DEFAULT_MAX_SESSION_DURATION.
     *
     * @returns A RealtimeModel instance configured for Azure OpenAI Service.
     *
     * @throws Error if required Azure parameters are missing or invalid.
     */
    static withAzure({ azureDeployment, azureEndpoint, apiVersion, apiKey, entraToken, baseURL, voice, inputAudioTranscription, turnDetection, temperature, speed, }: {
        azureDeployment: string;
        azureEndpoint?: string;
        apiVersion?: string;
        apiKey?: string;
        entraToken?: string;
        baseURL?: string;
        voice?: string;
        inputAudioTranscription?: api_proto.InputAudioTranscription;
        turnDetection?: api_proto.TurnDetectionType;
        temperature?: number;
        speed?: number;
    }): RealtimeModel;
    session(): RealtimeSession;
    close(): Promise<void>;
}
/**
 * A session for the OpenAI Realtime API.
 *
 * This class is used to interact with the OpenAI Realtime API.
 * It is responsible for sending events to the OpenAI Realtime API and receiving events from it.
 *
 * It exposes two more events:
 * - openai_server_event_received: expose the raw server events from the OpenAI Realtime API
 * - openai_client_event_queued: expose the raw client events sent to the OpenAI Realtime API
 */
export declare class RealtimeSession extends llm.RealtimeSession {
    #private;
    private _tools;
    private remoteChatCtx;
    private messageChannel;
    private inputResampler?;
    private instructions?;
    private oaiRealtimeModel;
    private currentGeneration?;
    private responseCreatedFutures;
    private textModeRecoveryRetries;
    private itemCreateFutures;
    private itemDeleteFutures;
    private updateChatCtxLock;
    private updateFuncCtxLock;
    private bstream;
    private pushedDurationMs;
    constructor(realtimeModel: RealtimeModel);
    sendEvent(command: api_proto.ClientEvent): void;
    private createSessionUpdateEvent;
    get chatCtx(): llm.ChatContext;
    get tools(): llm.ToolContext;
    updateChatCtx(_chatCtx: llm.ChatContext): Promise<void>;
    private createChatCtxUpdateEvents;
    updateTools(_tools: llm.ToolContext): Promise<void>;
    private createToolsUpdateEvent;
    updateInstructions(_instructions: string): Promise<void>;
    updateOptions({ toolChoice }: {
        toolChoice?: llm.ToolChoice;
    }): void;
    pushAudio(frame: AudioFrame): void;
    commitAudio(): Promise<void>;
    clearAudio(): Promise<void>;
    generateReply(instructions?: string): Promise<llm.GenerationCreatedEvent>;
    interrupt(): Promise<void>;
    truncate(_options: {
        messageId: string;
        audioEndMs: number;
    }): Promise<void>;
    private loggableEvent;
    private createWsConn;
    private runWs;
    close(): Promise<void>;
    private handleInputAudioBufferSpeechStarted;
    private handleInputAudioBufferSpeechStopped;
    private handleResponseCreated;
    private handleResponseOutputItemAdded;
    private handleConversationItemCreated;
    private handleConversationItemDeleted;
    private handleConversationItemInputAudioTranscriptionCompleted;
    private handleConversationItemInputAudioTranscriptionFailed;
    private handleResponseContentPartAdded;
    private handleResponseContentPartDone;
    private handleResponseAudioTranscriptDelta;
    private handleResponseAudioDelta;
    private handleResponseAudioTranscriptDone;
    private handleResponseAudioDone;
    private handleResponseOutputItemDone;
    private handleResponseDone;
    private handleError;
    private emitError;
    private resampleAudio;
    private createResponse;
    private resolveGeneration;
}
export {};
//# sourceMappingURL=realtime_model.d.ts.map