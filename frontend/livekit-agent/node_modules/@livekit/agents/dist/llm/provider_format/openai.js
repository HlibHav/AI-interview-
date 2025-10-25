import { serializeImage } from "../utils.js";
import { groupToolCalls } from "./utils.js";
async function toChatCtx(chatCtx, injectDummyUserMessage = true) {
  const itemGroups = groupToolCalls(chatCtx);
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
    serialized = await serializeImage(content);
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
export {
  toChatCtx
};
//# sourceMappingURL=openai.js.map