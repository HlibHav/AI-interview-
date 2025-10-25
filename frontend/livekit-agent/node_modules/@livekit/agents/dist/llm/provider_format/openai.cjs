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
var openai_exports = {};
__export(openai_exports, {
  toChatCtx: () => toChatCtx
});
module.exports = __toCommonJS(openai_exports);
var import_utils = require("../utils.cjs");
var import_utils2 = require("./utils.cjs");
async function toChatCtx(chatCtx, injectDummyUserMessage = true) {
  const itemGroups = (0, import_utils2.groupToolCalls)(chatCtx);
  const messages = [];
  for (const group of itemGroups) {
    if (group.isEmpty) continue;
    const message = group.message ? await toChatItem(group.message) : { role: "assistant" };
    const toolCalls = group.toolCalls.map((toolCall) => ({
      type: "function",
      id: toolCall.callId,
      function: { name: toolCall.name, arguments: toolCall.args }
    }));
    if (toolCalls.length > 0) {
      message["tool_calls"] = toolCalls;
    }
    messages.push(message);
    for (const toolOutput of group.toolOutputs) {
      messages.push(await toChatItem(toolOutput));
    }
  }
  return messages;
}
async function toChatItem(item) {
  if (item.type === "message") {
    const listContent = [];
    let textContent = "";
    for (const content2 of item.content) {
      if (typeof content2 === "string") {
        if (textContent) textContent += "\n";
        textContent += content2;
      } else if (content2.type === "image_content") {
        listContent.push(await toImageContent(content2));
      } else {
        throw new Error(`Unsupported content type: ${content2.type}`);
      }
    }
    const content = listContent.length == 0 ? textContent : textContent.length == 0 ? listContent : [...listContent, { type: "text", text: textContent }];
    return { role: item.role, content };
  } else if (item.type === "function_call") {
    return {
      role: "assistant",
      tool_calls: [
        {
          id: item.callId,
          type: "function",
          function: { name: item.name, arguments: item.args }
        }
      ]
    };
  } else if (item.type === "function_call_output") {
    return {
      role: "tool",
      tool_call_id: item.callId,
      content: item.output
    };
  } else {
    throw new Error(`Unsupported item type: ${item["type"]}`);
  }
}
async function toImageContent(content) {
  const cacheKey = "serialized_image";
  let serialized;
  if (content._cache[cacheKey] === void 0) {
    serialized = await (0, import_utils.serializeImage)(content);
    content._cache[cacheKey] = serialized;
  }
  serialized = content._cache[cacheKey];
  if (serialized.externalUrl) {
    return {
      type: "image_url",
      image_url: {
        url: serialized.externalUrl,
        detail: serialized.inferenceDetail
      }
    };
  }
  if (serialized.base64Data === void 0) {
    throw new Error("Serialized image has no data bytes");
  }
  return {
    type: "image_url",
    image_url: {
      url: `data:${serialized.mimeType};base64,${serialized.base64Data}`,
      detail: serialized.inferenceDetail
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toChatCtx
});
//# sourceMappingURL=openai.cjs.map