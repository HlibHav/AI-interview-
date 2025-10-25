"use strict";
var import_vitest = require("vitest");
var import_chat_context = require("./chat_context.cjs");
var import_remote_chat_context = require("./remote_chat_context.cjs");
function createMessage(id, content) {
  return new import_chat_context.ChatMessage({ id, role: "user", content });
}
(0, import_vitest.describe)("RemoteChatContext", () => {
  let context;
  (0, import_vitest.beforeEach)(() => {
    context = new import_remote_chat_context.RemoteChatContext();
  });
  (0, import_vitest.describe)("empty context", () => {
    (0, import_vitest.it)("should return empty ChatContext", () => {
      const chatCtx = context.toChatCtx();
      (0, import_vitest.expect)(chatCtx.items).toHaveLength(0);
    });
    (0, import_vitest.it)("should return null for non-existent item", () => {
      (0, import_vitest.expect)(context.get("nonexistent")).toBeNull();
    });
    (0, import_vitest.it)("should throw error when deleting non-existent item", () => {
      (0, import_vitest.expect)(() => context.delete("nonexistent")).toThrow("Item with ID nonexistent not found");
    });
  });
  (0, import_vitest.describe)("single item operations", () => {
    (0, import_vitest.it)("should insert single item at head", () => {
      const msg = createMessage("msg1", "Hello");
      context.insert(void 0, msg);
      (0, import_vitest.expect)(context.get("msg1")).toBeDefined();
      (0, import_vitest.expect)(context.get("msg1").item).toBe(msg);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg]);
    });
    (0, import_vitest.it)("should delete single item", () => {
      const msg = createMessage("msg1", "Hello");
      context.insert(void 0, msg);
      context.delete("msg1");
      (0, import_vitest.expect)(context.get("msg1")).toBeNull();
      (0, import_vitest.expect)(context.toChatCtx().items).toHaveLength(0);
    });
  });
  (0, import_vitest.describe)("multiple item operations", () => {
    (0, import_vitest.it)("should insert multiple items at head", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert(void 0, msg2);
      context.insert(void 0, msg3);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg3, msg2, msg1]);
    });
    (0, import_vitest.it)("should insert items after specific nodes", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg1", msg3);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg3, msg2]);
    });
    (0, import_vitest.it)("should insert at tail", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg2, msg3]);
    });
  });
  (0, import_vitest.describe)("deletion edge cases", () => {
    (0, import_vitest.it)("should delete head node from multi-item list", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      context.delete("msg1");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg2, msg3]);
    });
    (0, import_vitest.it)("should delete tail node from multi-item list", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      context.delete("msg3");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg2]);
    });
    (0, import_vitest.it)("should delete middle node from multi-item list", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      context.delete("msg2");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg3]);
    });
    (0, import_vitest.it)("should handle multiple deletions", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      const msg4 = createMessage("msg4", "Fourth");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      context.insert("msg3", msg4);
      context.delete("msg2");
      context.delete("msg4");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg3]);
      context.delete("msg1");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg3]);
      context.delete("msg3");
      (0, import_vitest.expect)(context.toChatCtx().items).toHaveLength(0);
    });
  });
  (0, import_vitest.describe)("error conditions", () => {
    (0, import_vitest.it)("should throw error when inserting duplicate ID", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg1", "Duplicate");
      context.insert(void 0, msg1);
      (0, import_vitest.expect)(() => context.insert(void 0, msg2)).toThrow("Item with ID msg1 already exists.");
    });
    (0, import_vitest.it)("should throw error when inserting after non-existent ID", () => {
      const msg = createMessage("msg1", "Hello");
      (0, import_vitest.expect)(() => context.insert("nonexistent", msg)).toThrow(
        "previousItemId nonexistent not found"
      );
    });
    (0, import_vitest.it)("should throw error when deleting non-existent ID", () => {
      (0, import_vitest.expect)(() => context.delete("nonexistent")).toThrow("Item with ID nonexistent not found");
    });
  });
  (0, import_vitest.describe)("complex scenarios", () => {
    (0, import_vitest.it)("should handle interleaved inserts and deletes", () => {
      const msg1 = createMessage("msg1", "A");
      const msg2 = createMessage("msg2", "B");
      const msg3 = createMessage("msg3", "C");
      const msg4 = createMessage("msg4", "D");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.delete("msg1");
      context.insert("msg2", msg3);
      context.insert(void 0, msg4);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg4, msg2, msg3]);
    });
    (0, import_vitest.it)("should maintain correct pointers after complex operations", () => {
      const msg1 = createMessage("msg1", "A");
      const msg2 = createMessage("msg2", "B");
      const msg3 = createMessage("msg3", "C");
      const msg4 = createMessage("msg4", "D");
      const msg5 = createMessage("msg5", "E");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      context.insert("msg1", msg4);
      context.insert("msg4", msg5);
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg4, msg5, msg2, msg3]);
      context.delete("msg4");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg1, msg5, msg2, msg3]);
      context.delete("msg1");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg5, msg2, msg3]);
      context.delete("msg2");
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([msg5, msg3]);
    });
    (0, import_vitest.it)("should handle rebuilding from scratch", () => {
      const messages = Array.from(
        { length: 10 },
        (_, i) => createMessage(`msg${i}`, `Content ${i}`)
      );
      for (const msg of messages) {
        context.insert(void 0, msg);
      }
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual([...messages].reverse());
      for (let i = 0; i < 5; i++) {
        context.delete(`msg${i}`);
      }
      const remaining = [...messages].reverse().filter((msg) => !["msg0", "msg1", "msg2", "msg3", "msg4"].includes(msg.id));
      (0, import_vitest.expect)(context.toChatCtx().items).toEqual(remaining);
    });
  });
  (0, import_vitest.describe)("get method", () => {
    (0, import_vitest.it)("should return correct item for existing ID", () => {
      const msg1 = createMessage("msg1", "Hello");
      const msg2 = createMessage("msg2", "World");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      const retrieved = context.get("msg2");
      (0, import_vitest.expect)(retrieved).toBeDefined();
      (0, import_vitest.expect)(retrieved.item).toBe(msg2);
    });
    (0, import_vitest.it)("should return null for non-existent ID", () => {
      const msg = createMessage("msg1", "Hello");
      context.insert(void 0, msg);
      (0, import_vitest.expect)(context.get("nonexistent")).toBeNull();
    });
  });
  (0, import_vitest.describe)("toChatCtx method", () => {
    (0, import_vitest.it)("should preserve order in ChatContext", () => {
      const msg1 = createMessage("msg1", "First");
      const msg2 = createMessage("msg2", "Second");
      const msg3 = createMessage("msg3", "Third");
      context.insert(void 0, msg1);
      context.insert("msg1", msg2);
      context.insert("msg2", msg3);
      const chatCtx = context.toChatCtx();
      (0, import_vitest.expect)(chatCtx.items).toEqual([msg1, msg2, msg3]);
    });
    (0, import_vitest.it)("should work with empty context", () => {
      const chatCtx = context.toChatCtx();
      (0, import_vitest.expect)(chatCtx.items).toHaveLength(0);
    });
    (0, import_vitest.it)("should create new ChatContext instance", () => {
      const msg = createMessage("msg1", "Hello");
      context.insert(void 0, msg);
      const chatCtx1 = context.toChatCtx();
      const chatCtx2 = context.toChatCtx();
      (0, import_vitest.expect)(chatCtx1).not.toBe(chatCtx2);
      (0, import_vitest.expect)(chatCtx1.items).toEqual(chatCtx2.items);
    });
  });
});
//# sourceMappingURL=remote_chat_context.test.cjs.map