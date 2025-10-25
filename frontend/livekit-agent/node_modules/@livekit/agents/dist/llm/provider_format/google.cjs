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
var google_exports = {};
__export(google_exports, {
  toChatCtx: () => toChatCtx
});
module.exports = __toCommonJS(google_exports);
var import_utils = require("../utils.cjs");
var import_utils2 = require("./utils.cjs");
async function toChatCtx(chatCtx, injectDummyUserMessage = true) {
  const turns = [];
  const systemMessages = [];
  let currentRole = null;
  let parts = [];
  const itemGroups = (0, import_utils2.groupToolCalls)(chatCtx);
  const flattenedItems = [];
  for (const group of itemGroups) {
    flattenedItems.push(...group.flatten());
  }
  for (const msg of flattenedItems) {
    if (msg.type === "message" && msg.role === "system" && msg.textContent) {
      systemMessages.push(msg.textContent);
      continue;
    }
    let role;
    if (msg.type === "message") {
      role = msg.role === "assistant" ? "model" : "user";
    } else if (msg.type === "function_call") {
      role = "model";
    } else if (msg.type === "function_call_output") {
      role = "user";
    } else {
      continue;
    }
    if (role !== currentRole) {
      if (currentRole !== null && parts.length > 0) {
        turns.push({ role: currentRole, parts: [...parts] });
      }
      parts = [];
      currentRole = role;
    }
    if (msg.type === "message") {
      for (const content of msg.content) {
        if (content && typeof content === "string") {
          parts.push({ text: content });
        } else if (content && typeof content === "object") {
          if (content.type === "image_content") {
            parts.push(await toImagePart(content));
          } else {
            parts.push({ text: JSON.stringify(content) });
          }
        }
      }
    } else if (msg.type === "function_call") {
      parts.push({
        functionCall: {
          id: msg.callId,
          name: msg.name,
          args: JSON.parse(msg.args || "{}")
        }
      });
    } else if (msg.type === "function_call_output") {
      const response = msg.isError ? { error: msg.output } : { output: msg.output };
      parts.push({
        functionResponse: {
          id: msg.callId,
          name: msg.name,
          response
        }
      });
    }
  }
  if (currentRole !== null && parts.length > 0) {
    turns.push({ role: currentRole, parts });
  }
  if (injectDummyUserMessage && currentRole !== "user") {
    turns.push({ role: "user", parts: [{ text: "." }] });
  }
  return [
    turns,
    {
      systemMessages: systemMessages.length > 0 ? systemMessages : null
    }
  ];
}
async function toImagePart(image) {
  const cacheKey = "serialized_image";
  if (!image._cache[cacheKey]) {
    image._cache[cacheKey] = await (0, import_utils.serializeImage)(image);
  }
  const img = image._cache[cacheKey];
  if (img.externalUrl) {
    const mimeType = img.mimeType || "image/jpeg";
    return {
      fileData: {
        fileUri: img.externalUrl,
        mimeType
      }
    };
  }
  return {
    inlineData: {
      data: img.base64Data,
      mimeType: img.mimeType
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  toChatCtx
});
//# sourceMappingURL=google.cjs.map