import type { ChatContext, ChatItem, ChatMessage, FunctionCall, FunctionCallOutput } from '../chat_context.js';
declare class ChatItemGroup {
    message?: ChatMessage;
    toolCalls: FunctionCall[];
    toolOutputs: FunctionCallOutput[];
    logger: import("pino").Logger;
    constructor(params: {
        message?: ChatMessage;
        toolCalls: FunctionCall[];
        toolOutputs: FunctionCallOutput[];
    });
    static create(params?: {
        message?: ChatMessage;
        toolCalls?: FunctionCall[];
        toolOutputs?: FunctionCallOutput[];
    }): ChatItemGroup;
    get isEmpty(): boolean;
    add(item: ChatItem): this;
    removeInvalidToolCalls(): void;
    flatten(): ChatItem[];
}
/**
 * Group chat items (messages, function calls, and function outputs)
 * into coherent groups based on their item IDs and call IDs.
 *
 * Each group will contain:
 * - Zero or one assistant message
 * - Zero or more function/tool calls
 * - The corresponding function/tool outputs matched by call_id
 *
 * User and system messages are placed in their own individual groups.
 *
 * @param chatCtx - The chat context containing all conversation items
 * @returns A list of ChatItemGroup objects representing the grouped conversation
 */
export declare function groupToolCalls(chatCtx: ChatContext): ChatItemGroup[];
export {};
//# sourceMappingURL=utils.d.ts.map