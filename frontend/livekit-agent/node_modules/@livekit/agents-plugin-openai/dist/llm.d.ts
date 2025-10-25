import type { APIConnectOptions } from '@livekit/agents';
import { inference, llm } from '@livekit/agents';
import { OpenAI } from 'openai';
import type { CerebrasChatModels, ChatModels, DeepSeekChatModels, GroqChatModels, MetaChatModels, OctoChatModels, PerplexityChatModels, TelnyxChatModels, TogetherChatModels, XAIChatModels } from './models.js';
export interface LLMOptions {
    model: string | ChatModels;
    apiKey?: string;
    baseURL?: string;
    user?: string;
    temperature?: number;
    client?: OpenAI;
    toolChoice?: llm.ToolChoice;
    parallelToolCalls?: boolean;
    metadata?: Record<string, string>;
    maxCompletionTokens?: number;
    serviceTier?: string;
    store?: boolean;
}
export declare class LLM extends llm.LLM {
    #private;
    /**
     * Create a new instance of OpenAI LLM.
     *
     * @remarks
     * `apiKey` must be set to your OpenAI API key, either using the argument or by setting the
     * `OPENAI_API_KEY` environment variable.
     */
    constructor(opts?: Partial<LLMOptions>, providerFmt?: llm.ProviderFormat);
    label(): string;
    get model(): string;
    /**
     * Create a new instance of OpenAI LLM with Azure.
     *
     * @remarks
     * This automatically infers the following arguments from their corresponding environment variables if they are not provided:
     * - `apiKey` from `AZURE_OPENAI_API_KEY`
     * - `organization` from `OPENAI_ORG_ID`
     * - `project` from `OPENAI_PROJECT_ID`
     * - `azureAdToken` from `AZURE_OPENAI_AD_TOKEN`
     * - `apiVersion` from `OPENAI_API_VERSION`
     * - `azureEndpoint` from `AZURE_OPENAI_ENDPOINT`
     */
    static withAzure(opts?: {
        model: string | ChatModels;
        azureEndpoint?: string;
        azureDeployment?: string;
        apiVersion?: string;
        apiKey?: string;
        azureAdToken?: string;
        azureAdTokenProvider?: () => Promise<string>;
        organization?: string;
        project?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
    }): LLM;
    /**
     * Create a new instance of Cerebras LLM.
     *
     * @remarks
     * `apiKey` must be set to your Cerebras API key, either using the argument or by setting the
     * `CEREBRAS_API_KEY` environment variable.
     */
    static withCerebras(opts?: Partial<{
        model: string | CerebrasChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of Fireworks LLM.
     *
     * @remarks
     * `apiKey` must be set to your Fireworks API key, either using the argument or by setting the
     * `FIREWORKS_API_KEY` environment variable.
     */
    static withFireworks(opts?: Partial<LLMOptions>): LLM;
    /**
     * Create a new instance of xAI LLM.
     *
     * @remarks
     * `apiKey` must be set to your xAI API key, either using the argument or by setting the
     * `XAI_API_KEY` environment variable.
     */
    static withXAI(opts?: Partial<{
        model: string | XAIChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of Groq LLM.
     *
     * @remarks
     * `apiKey` must be set to your Groq API key, either using the argument or by setting the
     * `GROQ_API_KEY` environment variable.
     */
    static withGroq(opts?: Partial<{
        model: string | GroqChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of DeepSeek LLM.
     *
     * @remarks
     * `apiKey` must be set to your DeepSeek API key, either using the argument or by setting the
     * `DEEPSEEK_API_KEY` environment variable.
     */
    static withDeepSeek(opts?: Partial<{
        model: string | DeepSeekChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of OctoAI LLM.
     *
     * @remarks
     * `apiKey` must be set to your OctoAI API key, either using the argument or by setting the
     * `OCTOAI_TOKEN` environment variable.
     */
    static withOcto(opts?: Partial<{
        model: string | OctoChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /** Create a new instance of Ollama LLM. */
    static withOllama(opts?: Partial<{
        model: string;
        baseURL?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of PerplexityAI LLM.
     *
     * @remarks
     * `apiKey` must be set to your PerplexityAI API key, either using the argument or by setting the
     * `PERPLEXITY_API_KEY` environment variable.
     */
    static withPerplexity(opts?: Partial<{
        model: string | PerplexityChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of TogetherAI LLM.
     *
     * @remarks
     * `apiKey` must be set to your TogetherAI API key, either using the argument or by setting the
     * `TOGETHER_API_KEY` environment variable.
     */
    static withTogether(opts?: Partial<{
        model: string | TogetherChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of Telnyx LLM.
     *
     * @remarks
     * `apiKey` must be set to your Telnyx API key, either using the argument or by setting the
     * `TELNYX_API_KEY` environment variable.
     */
    static withTelnyx(opts?: Partial<{
        model: string | TelnyxChatModels;
        apiKey?: string;
        baseURL?: string;
        user?: string;
        temperature?: number;
        client: OpenAI;
    }>): LLM;
    /**
     * Create a new instance of Meta Llama LLM.
     *
     * @remarks
     * `apiKey` must be set to your Meta Llama API key, either using the argument or by setting the
     * `LLAMA_API_KEY` environment variable.
     */
    static withMeta(opts?: Partial<{
        apiKey?: string;
        baseURL?: string;
        client?: OpenAI;
        model?: string | MetaChatModels;
        temperature?: number;
        user?: string;
    }>): LLM;
    chat({ chatCtx, toolCtx, connOptions, parallelToolCalls, toolChoice, extraKwargs, }: {
        chatCtx: llm.ChatContext;
        toolCtx?: llm.ToolContext;
        connOptions?: APIConnectOptions;
        parallelToolCalls?: boolean;
        toolChoice?: llm.ToolChoice;
        extraKwargs?: Record<string, any>;
    }): LLMStream;
}
export declare class LLMStream extends inference.LLMStream {
}
//# sourceMappingURL=llm.d.ts.map