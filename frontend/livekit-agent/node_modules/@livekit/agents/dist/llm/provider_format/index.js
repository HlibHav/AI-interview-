import { toChatCtx as toChatCtxGoogle } from "./google.js";
import { toChatCtx as toChatCtxOpenai } from "./openai.js";
async function toChatCtx(format, chatCtx, injectDummyUserMessage = true) {
  switch (format) {
    case "openai":
      return await toChatCtxOpenai(chatCtx, injectDummyUserMessage);
    case "google":
      return await toChatCtxGoogle(chatCtx, injectDummyUserMessage);
    default:
      throw new Error(`Unsupported provider format: ${format}`);
  }
}
export {
  toChatCtx
};
//# sourceMappingURL=index.js.map