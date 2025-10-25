"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var chat_context_exports = {};
__export(chat_context_exports, {
  ChatContext: () => ChatContext,
  ChatMessage: () => ChatMessage,
  FunctionCall: () => FunctionCall,
  FunctionCallOutput: () => FunctionCallOutput,
  ReadonlyChatContext: () => ReadonlyChatContext,
  createAudioContent: () => createAudioContent,
  createImageContent: () => createImageContent
});
module.exports = __toCommonJS(chat_context_exports);
var import_utils = require("../utils.cjs");
var import_provider_format = require("./provider_format/index.cjs");
function createImageContent(params) {
  const {
    image,
    id = (0, import_utils.shortuuid)("img_"),
    inferenceDetail = "auto",
    inferenceWidth,
    inferenceHeight,
    mimeType
  } = params;
  return {
    id,
    type: "image_content",
    image,
    inferenceDetail,
    inferenceWidth,
    inferenceHeight,
    mimeType,
    _cache: {}
  };
}
function createAudioContent(params) {
  const { frame, transcript } = params;
  return {
    type: "audio_content",
    frame,
    transcript
  };
}
class ChatMessage {
  id;
  type = "message";
  role;
  content;
  interrupted;
  hash;
  createdAt;
  constructor(params) {
    const {
      role,
      content,
      id = (0, import_utils.shortuuid)("item_"),
      interrupted = false,
      createdAt = Date.now()
    } = params;
    this.id = id;
    this.role = role;
    this.content = Array.isArray(content) ? content : [content];
    this.interrupted = interrupted;
    this.createdAt = createdAt;
  }
  static create(params) {
    return new ChatMessage(params);
  }
  /**
   * Returns a single string with all text parts of the message joined by new
   * lines. If no string content is present, returns `null`.
   */
  get textContent() {
    const parts = this.content.filter((c) => typeof c === "string");
    return parts.length > 0 ? parts.join("\n") : void 0;
  }
  toJSONContent() {
    return this.content.map((c) => {
      if (typeof c === "string") {
        return c;
      } else if (c.type === "image_content") {
        return {
          id: c.id,
          type: c.type,
          image: c.image,
          inferenceDetail: c.inferenceDetail,
          inferenceWidth: c.inferenceWidth,
          inferenceHeight: c.inferenceHeight,
          mimeType: c.mimeType
        };
      } else {
        return {
          type: c.type,
          transcript: c.transcript
        };
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(excludeTimestamp = false) {
    const result = {
      id: this.id,
      type: this.type,
      role: this.role,
      content: this.toJSONContent(),
      interrupted: this.interrupted
    };
    if (!excludeTimestamp) {
      result.createdAt = this.createdAt;
    }
    return result;
  }
}
class FunctionCall {
  id;
  type = "function_call";
  callId;
  args;
  name;
  createdAt;
  constructor(params) {
    const { callId, name, args, id = (0, import_utils.shortuuid)("item_"), createdAt = Date.now() } = params;
    this.id = id;
    this.callId = callId;
    this.args = args;
    this.name = name;
    this.createdAt = createdAt;
  }
  static create(params) {
    return new FunctionCall(params);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(excludeTimestamp = false) {
    const result = {
      id: this.id,
      type: this.type,
      callId: this.callId,
      name: this.name,
      args: this.args
    };
    if (!excludeTimestamp) {
      result.createdAt = this.createdAt;
    }
    return result;
  }
}
class FunctionCallOutput {
  id;
  type = "function_call_output";
  name = "";
  callId;
  output;
  isError;
  createdAt;
  constructor(params) {
    const {
      callId,
      output,
      isError,
      id = (0, import_utils.shortuuid)("item_"),
      createdAt = Date.now(),
      name = ""
    } = params;
    this.id = id;
    this.callId = callId;
    this.output = output;
    this.isError = isError;
    this.name = name;
    this.createdAt = createdAt;
  }
  static create(params) {
    return new FunctionCallOutput(params);
  }
  toJSON(excludeTimestamp = false) {
    const result = {
      id: this.id,
      type: this.type,
      name: this.name,
      callId: this.callId,
      output: this.output,
      isError: this.isError
    };
    if (!excludeTimestamp) {
      result.createdAt = this.createdAt;
    }
    return result;
  }
}
class ChatContext {
  _items;
  constructor(items) {
    this._items = items ? items : [];
  }
  static empty() {
    return new ChatContext([]);
  }
  get items() {
    return this._items;
  }
  set items(items) {
    this._items = items;
  }
  /**
   * Add a new message to the context and return it.
   */
  addMessage(params) {
    const msg = new ChatMessage(params);
    if (params.createdAt !== void 0) {
      const idx = this.findInsertionIndex(params.createdAt);
      this._items.splice(idx, 0, msg);
    } else {
      this._items.push(msg);
    }
    return msg;
  }
  /**
   * Insert a single item or multiple items based on their `createdAt` field so
   * that the array keeps its chronological order.
   */
  insert(item) {
    const arr = Array.isArray(item) ? item : [item];
    for (const it of arr) {
      const idx = this.findInsertionIndex(it.createdAt);
      this._items.splice(idx, 0, it);
    }
  }
  getById(itemId) {
    return this._items.find((i) => i.id === itemId);
  }
  indexById(itemId) {
    const idx = this._items.findIndex((i) => i.id === itemId);
    return idx !== -1 ? idx : void 0;
  }
  copy(options = {}) {
    const {
      excludeFunctionCall = false,
      excludeInstructions = false,
      excludeEmptyMessage = false,
      toolCtx
    } = options;
    const items = [];
    const isToolCallOrOutput = (item) => ["function_call", "function_call_output"].includes(item.type);
    const isChatMessage = (item) => item.type === "message";
    for (const item of this._items) {
      if (excludeFunctionCall && isToolCallOrOutput(item)) {
        continue;
      }
      if (excludeInstructions && isChatMessage(item) && ["system", "developer"].includes(item.role)) {
        continue;
      }
      if (excludeEmptyMessage && isChatMessage(item) && item.content.length === 0) {
        continue;
      }
      if (toolCtx !== void 0 && isToolCallOrOutput(item) && toolCtx[item.name] === void 0) {
        continue;
      }
      items.push(item);
    }
    return new ChatContext(items);
  }
  truncate(maxItems) {
    if (maxItems <= 0) return this;
    const instructions = this._items.find((i) => i.type === "message" && i.role === "system");
    let newItems = this._items.slice(-maxItems);
    while (newItems.length > 0 && ["function_call", "function_call_output"].includes(newItems[0].type)) {
      newItems.shift();
    }
    if (instructions) {
      if (!newItems.includes(instructions)) {
        newItems = [instructions, ...newItems];
      }
    }
    this._items.splice(0, this._items.length, ...newItems);
    return this;
  }
  toJSON(options = {}) {
    const {
      excludeImage = true,
      excludeAudio = true,
      excludeTimestamp = true,
      excludeFunctionCall = false
    } = options;
    const items = [];
    for (const item of this._items) {
      let processedItem = item;
      if (excludeFunctionCall && ["function_call", "function_call_output"].includes(item.type)) {
        continue;
      }
      if (item.type === "message") {
        processedItem = ChatMessage.create({
          role: item.role,
          content: item.content,
          id: item.id,
          interrupted: item.interrupted,
          createdAt: item.createdAt
        });
        if (excludeImage) {
          processedItem.content = processedItem.content.filter((c) => {
            return !(typeof c === "object" && c.type === "image_content");
          });
        }
        if (excludeAudio) {
          processedItem.content = processedItem.content.filter((c) => {
            return !(typeof c === "object" && c.type === "audio_content");
          });
        }
      }
      items.push(processedItem);
    }
    return {
      items: items.map((item) => item.toJSON(excludeTimestamp))
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async toProviderFormat(format, injectDummyUserMessage = true) {
    return await (0, import_provider_format.toChatCtx)(format, this, injectDummyUserMessage);
  }
  /**
   * Internal helper used by `truncate` & `addMessage` to find the correct
   * insertion index for a timestamp so the list remains sorted.
   */
  findInsertionIndex(createdAt) {
    for (let i = this._items.length - 1; i >= 0; i -= 1) {
      const item = this._items[i];
      if (item.createdAt <= createdAt) {
        return i + 1;
      }
    }
    return 0;
  }
  /**
   * Indicates whether the context is read-only
   */
  get readonly() {
    return false;
  }
}
class ReadonlyChatContext extends ChatContext {
  static errorMsg = "Please use .copy() and agent.update_chat_ctx() to modify the chat context.";
  constructor(items) {
    super((0, import_utils.createImmutableArray)(items, ReadonlyChatContext.errorMsg));
  }
  get items() {
    return this._items;
  }
  set items(items) {
    throw new Error(
      `Cannot set items on a read-only chat context. ${ReadonlyChatContext.errorMsg}`
    );
  }
  get readonly() {
    return true;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatContext,
  ChatMessage,
  FunctionCall,
  FunctionCallOutput,
  ReadonlyChatContext,
  createAudioContent,
  createImageContent
});
//# sourceMappingURL=chat_context.cjs.map