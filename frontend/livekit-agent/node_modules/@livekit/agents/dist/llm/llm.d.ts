import type { TypedEventEmitter as TypedEmitter } from '@livekit/typed-emitter';
import type { LLMMetrics } from '../metrics/base.js';
import type { APIConnectOptions } from '../types.js';
import { AsyncIterableQueue } from '../utils.js';
import { type ChatContext, type ChatRole, type FunctionCall } from './chat_context.js';
import type { ToolChoice, ToolContext } from './tool_context.js';
export interface ChoiceDelta {
    role: ChatRole;
    content?: string;
    toolCalls?: FunctionCall[];
}
export interface CompletionUsage {
    completionTokens: number;
    promptTokens: number;
    promptCachedTokens: number;
    totalTokens: number;
}
export interface ChatChunk {
    id: string;
    delta?: ChoiceDelta;
    usage?: CompletionUsage;
}
export interface LLMError {
    type: 'llm_error';
    timestamp: number;
    label: string;
    error: Error;
    recoverable: boolean;
}
export type LLMCallbacks = {
    ['metrics_collected']: (metrics: LLMMetrics) => void;
    ['error']: (error: LLMError) => void;
};
declare const LLM_base: new () => TypedEmitter<LLMCallbacks>;
export declare abstract class LLM extends LLM_base {
    constructor();
    abstract label(): string;
    /**
     * Get the model name/identifier for this LLM instance.
     *
     * @returns The model name if available, "unknown" otherwise.
     *
     * @remarks
     * Plugins should override this property to provide their model information.
     */
    get model(): string;
    /**
     * Returns a {@link LLMStream} that can be used to push text and receive LLM responses.
     */
    abstract chat({ chatCtx, toolCtx, connOptions, parallelToolCalls, toolChoice, extraKwargs, }: {
        chatCtx: ChatContext;
        toolCtx?: ToolContext;
        connOptions?: APIConnectOptions;
        parallelToolCalls?: boolean;
        toolChoice?: ToolChoice;
        extraKwargs?: Record<string, any>;
    }): LLMStream;
    /**
     * Pre-warm connection to the LLM service
     */
    prewarm(): void;
    aclose(): Promise<void>;
}
export declare abstract class LLMStream implements AsyncIterableIterator<ChatChunk> {
    #private;
    protected output: AsyncIterableQueue<ChatChunk>;
    protected queue: AsyncIterableQueue<ChatChunk>;
    protected closed: boolean;
    protected abortController: AbortController;
    protected _connOptions: APIConnectOptions;
    protected logger: import("pino").Logger;
    constructor(llm: LLM, { chatCtx, toolCtx, connOptions, }: {
        chatCtx: ChatContext;
        toolCtx?: ToolContext;
        connOptions: APIConnectOptions;
    });
    private mainTask;
    private emitError;
    protected monitorMetrics(): Promise<void>;
    protected abstract run(): Promise<void>;
    /** The function context of this stream. */
    get toolCtx(): ToolContext | undefined;
    /** The initial chat context of this stream. */
    get chatCtx(): ChatContext;
    /** The connection options for this stream. */
    get connOptions(): APIConnectOptions;
    next(): Promise<IteratorResult<ChatChunk>>;
    close(): void;
    [Symbol.asyncIterator](): LLMStream;
}
export {};
//# sourceMappingURL=llm.d.ts.map