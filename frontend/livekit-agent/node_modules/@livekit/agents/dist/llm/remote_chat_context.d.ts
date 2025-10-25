import { ChatContext } from './chat_context.js';
import type { ChatItem } from './chat_context.js';
export interface RemoteChatItem {
    item: ChatItem;
    /** @internal */
    _prev?: RemoteChatItem | null;
    /** @internal */
    _next?: RemoteChatItem | null;
}
export declare class RemoteChatContext {
    private head?;
    private tail?;
    private idToItem;
    toChatCtx(): ChatContext;
    get(itemId: string): RemoteChatItem | null;
    /**
     * Insert `message` after the node with ID `previousItemId`.
     * If `previousItemId` is undefined, insert at the head.
     * @param previousItemId - The ID of the item after which to insert the new item.
     * @param message - The item to insert.
     */
    insert(previousItemId: string | undefined, message: ChatItem): void;
    delete(itemId: string): void;
}
//# sourceMappingURL=remote_chat_context.d.ts.map