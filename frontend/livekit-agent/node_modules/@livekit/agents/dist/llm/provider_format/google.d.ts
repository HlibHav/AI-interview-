import type { ChatContext } from '../chat_context.js';
export interface GoogleFormatData {
    systemMessages: string[] | null;
}
export declare function toChatCtx(chatCtx: ChatContext, injectDummyUserMessage?: boolean): Promise<[Record<string, any>[], GoogleFormatData]>;
//# sourceMappingURL=google.d.ts.map