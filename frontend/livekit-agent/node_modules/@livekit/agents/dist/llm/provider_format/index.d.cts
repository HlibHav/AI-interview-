import type { ChatContext } from '../chat_context.js';
export type ProviderFormat = 'openai' | 'google';
export declare function toChatCtx(format: ProviderFormat, chatCtx: ChatContext, injectDummyUserMessage?: boolean): Promise<Record<string, any>[] | [Record<string, any>[], import("./google.js").GoogleFormatData]>;
//# sourceMappingURL=index.d.ts.map