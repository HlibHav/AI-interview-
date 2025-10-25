import { serializeImage } from "../utils.js";
import { groupToolCalls } from "./utils.js";
async function toChatCtx(chatCtx, injectDummyUserMessage = true) {
  const turns = [];
  const systemMessages = [];
  let currentRole = null;
  let parts = [];
  const itemGroups = groupToolCalls(chatCtx);
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
    image._cache[cacheKey] = await serializeImage(image);
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
export {
  toChatCtx
};
//# sourceMappingURL=google.js.map