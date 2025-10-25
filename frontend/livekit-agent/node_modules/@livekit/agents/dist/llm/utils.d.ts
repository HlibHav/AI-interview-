import type { JSONSchema7 } from 'json-schema';
import { ZodObject } from 'zod';
import type { ChatContext } from './chat_context.js';
import { FunctionCall, FunctionCallOutput, type ImageContent } from './chat_context.js';
import type { ToolContext, ToolInputSchema, ToolOptions } from './tool_context.js';
export interface SerializedImage {
    inferenceDetail: 'auto' | 'high' | 'low';
    mimeType?: string;
    base64Data?: string;
    externalUrl?: string;
}
export declare function serializeImage(image: ImageContent): Promise<SerializedImage>;
/** Raw OpenAI-adherent function parameters. */
export type OpenAIFunctionParameters = {
    type: 'object';
    properties: {
        [id: string]: any;
    };
    required: string[];
    additionalProperties?: boolean;
};
export declare const createToolOptions: <UserData extends unknown>(toolCallId: string, userData?: UserData) => ToolOptions<UserData>;
/** @internal */
export declare const oaiParams: (p: ZodObject<any>, isOpenai?: boolean) => OpenAIFunctionParameters;
/** @internal */
export declare const oaiBuildFunctionInfo: (toolCtx: ToolContext, toolCallId: string, toolName: string, rawArgs: string) => FunctionCall;
export declare function executeToolCall(toolCall: FunctionCall, toolCtx: ToolContext): Promise<FunctionCallOutput>;
interface DiffOps {
    toRemove: string[];
    toCreate: Array<[string | null, string]>;
}
/**
 * Compute the minimal list of create/remove operations to transform oldCtx into newCtx.
 *
 * @param oldCtx - The old chat context.
 * @param newCtx - The new chat context.
 * @returns The minimal list of create/remove operations to transform oldCtx into newCtx.
 */
export declare function computeChatCtxDiff(oldCtx: ChatContext, newCtx: ChatContext): DiffOps;
export declare function toJsonSchema(schema: ToolInputSchema<any>, isOpenai?: boolean): JSONSchema7;
export {};
//# sourceMappingURL=utils.d.ts.map