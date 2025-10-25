import { ChatContext } from "./chat_context.js";
class RemoteChatContext {
  head;
  tail;
  idToItem = {};
  toChatCtx() {
    const items = [];
    let currentNode = this.head;
    while (currentNode) {
      items.push(currentNode.item);
      currentNode = currentNode._next;
    }
    return new ChatContext(items);
  }
  get(itemId) {
    return this.idToItem[itemId] ?? null;
  }
  /**
   * Insert `message` after the node with ID `previousItemId`.
   * If `previousItemId` is undefined, insert at the head.
   * @param previousItemId - The ID of the item after which to insert the new item.
   * @param message - The item to insert.
   */
  insert(previousItemId, message) {
    const itemId = message.id;
    if (itemId in this.idToItem) {
      throw new Error(`Item with ID ${itemId} already exists.`);
    }
    const newNode = { item: message };
    if (!previousItemId) {
      if (this.head) {
        newNode._next = this.head;
        this.head._prev = newNode;
      } else {
        this.tail = newNode;
      }
      this.head = newNode;
      this.idToItem[itemId] = newNode;
      return;
    }
    const prevNode = this.idToItem[previousItemId];
    if (!prevNode) {
      throw new Error(`previousItemId ${previousItemId} not found`);
    }
    newNode._prev = prevNode;
    newNode._next = prevNode._next;
    prevNode._next = newNode;
    if (newNode._next) {
      newNode._next._prev = newNode;
    } else {
      this.tail = newNode;
    }
    this.idToItem[itemId] = newNode;
  }
  delete(itemId) {
    const node = this.idToItem[itemId];
    if (!node) {
      throw new Error(`Item with ID ${itemId} not found`);
    }
    const prevNode = node._prev;
    const nextNode = node._next;
    if (this.head === node) {
      this.head = nextNode;
      if (this.head) {
        this.head._prev = void 0;
      }
    } else {
      if (prevNode) {
        prevNode._next = nextNode;
      }
    }
    if (this.tail === node) {
      this.tail = prevNode;
      if (this.tail) {
        this.tail._next = void 0;
      }
    } else {
      if (nextNode) {
        nextNode._prev = prevNode;
      }
    }
    delete this.idToItem[itemId];
  }
}
export {
  RemoteChatContext
};
//# sourceMappingURL=remote_chat_context.js.map