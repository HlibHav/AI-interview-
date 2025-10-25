import OpenAI from 'openai';
import * as llm from '../llm/index.js';
import type { APIConnectOptions } from '../types.js';
import { type AnyString } from './utils.js';
export type OpenAIModels = 'openai/gpt-5' | 'openai/gpt-5-mini' | 'openai/gpt-5-nano' | 'openai/gpt-4.1' | 'openai/gpt-4.1-mini' | 'openai/gpt-4.1-nano' | 'openai/gpt-4o' | 'openai/gpt-4o-mini' | 'openai/gpt-oss-120b';
export type GoogleModels = 'google/gemini-2.0-flash-lite';
export type QwenModels = 'qwen/qwen3-235b-a22b-instruct';
export type KimiModels = 'moonshotai/kimi-k2-instruct';
export type DeepSeekModels = 'deepseek-ai/deepseek-v3';
type ChatCompletionPredictionContentParam = OpenAI.Chat.Completions.ChatCompletionPredictionContent;
type WebSearchOptions = OpenAI.Chat.Completions.ChatCompletionCreateParams.WebSearchOptions;
type ToolChoice = OpenAI.Chat.Completions.ChatCompletionCreateParams['tool_choice'];
type Verbosity = 'low' | 'medium' | 'high';
export interface ChatCompletionOptions extends Record<string, unknown> {
    frequency_penalty?: number;
    logit_bias?: Record<string, number>;
    logprobs?: boolean;
    max_completion_tokens?: number;
    max_tokens?: number;
    metadata?: Record<string, string>;
    modalities?: Array<'text' | 'audio'>;
    n?: number;
    parallel_tool_calls?: boolean;
    prediction?: ChatCompletionPredictionContentParam | null;
    presence_penalty?: number;
    prompt_cache_key?: string;
    reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
    safety_identifier?: string;
    seed?: number;
    service_tier?: 'auto' | 'default' | 'flex' | 'scale' | 'priority';
    stop?: string | string[];
    store?: boolean;
    temperature?: number;
    top_logprobs?: number;
    top_p?: number;
    user?: string;
    verbosity?: Verbosity;
    web_search_options?: WebSearchOptions;
    tool_choice?: ToolChoice;
}
export type LLMModels = OpenAIModels | GoogleModels | QwenModels | KimiModels | DeepSeekModels | AnyString;
export interface InferenceLLMOptions {
    model: LLMModels;
    provider?: string;
    baseURL: string;
    apiKey: string;
    apiSecret: string;
    modelOptions: ChatCompletionOptions;
}
export interface GatewayOptions {
    apiKey: string;
    apiSecret: string;
}
/**
 * Livekit Cloud Inference LLM
 */
export declare class LLM extends llm.LLM {
    private client;
    private opts;
    constructor(opts: {
        model: LLMModels;
        provider?: string;
        baseURL?: string;
        apiKey?: string;
        apiSecret?: string;
        modelOptions?: InferenceLLMOptions['modelOptions'];
    });
    label(): string;
    get model(): string;
    static fromModelString(modelString: string): LLM;
    chat({ chatCtx, toolCtx, connOptions, parallelToolCalls, toolChoice, extraKwargs, }: {
        chatCtx: llm.ChatContext;
        toolCtx?: llm.ToolContext;
        connOptions?: APIConnectOptions;
        parallelToolCalls?: boolean;
        toolChoice?: llm.ToolChoice;
        extraKwargs?: Record<string, unknown>;
    }): LLMStream;
}
export declare class LLMStream extends llm.LLMStream {
    private model;
    private provider?;
    private providerFmt;
    private client;
    private modelOptions;
    private gatewayOptions?;
    private toolCallId?;
    private toolIndex?;
    private fncName?;
    private fncRawArguments?;
    constructor(llm: LLM, { model, provider, client, chatCtx, toolCtx, gatewayOptions, connOptions, modelOptions, providerFmt, }: {
        model: LLMModels;
        provider?: string;
        client: OpenAI;
        chatCtx: llm.ChatContext;
        toolCtx?: llm.ToolContext;
        gatewayOptions?: GatewayOptions;
        connOptions: APIConnectOptions;
        modelOptions: Record<string, any>;
        providerFmt?: llm.ProviderFormat;
    });
    protected run(): Promise<void>;
    private parseChoice;
    private createRunningToolCallChunk;
}
export {};
//# sourceMappingURL=llm.d.ts.map