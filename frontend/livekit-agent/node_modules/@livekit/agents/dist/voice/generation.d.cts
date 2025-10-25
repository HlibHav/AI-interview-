/// <reference types="node" resolution-mode="require"/>
import type { AudioFrame } from '@livekit/rtc-node';
import type { ReadableStream } from 'stream/web';
import { type ChatContext, FunctionCall, FunctionCallOutput } from '../llm/chat_context.js';
import { type ToolChoice, type ToolContext } from '../llm/tool_context.js';
import { Future, Task } from '../utils.js';
import { type Agent, type ModelSettings } from './agent.js';
import type { AgentSession } from './agent_session.js';
import type { AudioOutput, LLMNode, TTSNode, TextOutput } from './io.js';
import type { SpeechHandle } from './speech_handle.js';
/** @internal */
export declare class _LLMGenerationData {
    readonly textStream: ReadableStream<string>;
    readonly toolCallStream: ReadableStream<FunctionCall>;
    generatedText: string;
    generatedToolCalls: FunctionCall[];
    id: string;
    constructor(textStream: ReadableStream<string>, toolCallStream: ReadableStream<FunctionCall>);
}
export declare class _ToolOutput {
    output: _JsOutput[];
    firstToolFut: Future;
    constructor();
}
export declare class _SanitizedOutput {
    toolCall: FunctionCall;
    toolCallOutput?: FunctionCallOutput;
    replyRequired: boolean;
    agentTask?: Agent;
    constructor(toolCall: FunctionCall, toolCallOutput: FunctionCallOutput | undefined, replyRequired: boolean, agentTask: Agent | undefined);
    static create(params: {
        toolCall: FunctionCall;
        toolCallOutput?: FunctionCallOutput;
        replyRequired?: boolean;
        agentTask?: Agent;
    }): _SanitizedOutput;
}
export declare class ToolExecutionOutput {
    readonly toolCall: FunctionCall;
    readonly toolCallOutput: FunctionCallOutput | undefined;
    readonly agentTask: Agent | undefined;
    readonly rawOutput: unknown;
    readonly rawException: Error | undefined;
    readonly replyRequired: boolean;
    constructor(toolCall: FunctionCall, toolCallOutput: FunctionCallOutput | undefined, agentTask: Agent | undefined, rawOutput: unknown, rawException: Error | undefined, replyRequired: boolean);
    static create(params: {
        toolCall: FunctionCall;
        toolCallOutput?: FunctionCallOutput;
        agentTask?: Agent;
        rawOutput: unknown;
        rawException?: Error;
        replyRequired?: boolean;
    }): ToolExecutionOutput;
}
export interface ToolOutput {
    output: ToolExecutionOutput[];
    firstToolStartedFuture: Future<void>;
}
export declare class _JsOutput {
    #private;
    toolCall: FunctionCall;
    output: unknown;
    exception?: Error;
    constructor(toolCall: FunctionCall, output: unknown, exception: Error | undefined);
    static create(params: {
        toolCall: FunctionCall;
        output?: unknown;
        exception?: Error;
    }): _JsOutput;
    sanitize(): _SanitizedOutput;
}
export declare function createToolOutput(params: {
    toolCall: FunctionCall;
    output?: unknown;
    exception?: Error;
}): ToolExecutionOutput;
/**
 * Update the instruction message in the chat context or insert a new one if missing.
 *
 * This function looks for an existing instruction message in the chat context using the identifier
 * 'INSTRUCTIONS_MESSAGE_ID'.
 *
 * @param options - The options for updating the instructions.
 * @param options.chatCtx - The chat context to update.
 * @param options.instructions - The instructions to add.
 * @param options.addIfMissing - Whether to add the instructions if they are missing.
 */
export declare function updateInstructions(options: {
    chatCtx: ChatContext;
    instructions: string;
    addIfMissing: boolean;
}): void;
export declare function performLLMInference(node: LLMNode, chatCtx: ChatContext, toolCtx: ToolContext, modelSettings: ModelSettings, controller: AbortController): [Task<void>, _LLMGenerationData];
export declare function performTTSInference(node: TTSNode, text: ReadableStream<string>, modelSettings: ModelSettings, controller: AbortController): [Task<void>, ReadableStream<AudioFrame>];
export interface _TextOut {
    text: string;
    firstTextFut: Future;
}
export declare function performTextForwarding(source: ReadableStream<string>, controller: AbortController, textOutput: TextOutput | null): [Task<void>, _TextOut];
export interface _AudioOut {
    audio: Array<AudioFrame>;
    firstFrameFut: Future;
}
export declare function performAudioForwarding(ttsStream: ReadableStream<AudioFrame>, audioOutput: AudioOutput, controller: AbortController): [Task<void>, _AudioOut];
export declare function performToolExecutions({ session, speechHandle, toolCtx, toolChoice, toolCallStream, onToolExecutionStarted, onToolExecutionCompleted, controller, }: {
    session: AgentSession;
    speechHandle: SpeechHandle;
    toolCtx: ToolContext;
    toolChoice?: ToolChoice;
    toolCallStream: ReadableStream<FunctionCall>;
    onToolExecutionStarted?: (toolCall: FunctionCall) => void;
    onToolExecutionCompleted?: (toolExecutionOutput: ToolExecutionOutput) => void;
    controller: AbortController;
}): [Task<void>, ToolOutput];
export declare function removeInstructions(chatCtx: ChatContext): void;
//# sourceMappingURL=generation.d.ts.map