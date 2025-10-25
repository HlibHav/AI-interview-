import { Plugin } from "@livekit/agents";
import { LLM, LLMStream } from "./llm.js";
export * from "./models.js";
import * as realtime from "./realtime/index.js";
import { STT } from "./stt.js";
import { ChunkedStream, TTS } from "./tts.js";
class OpenAIPlugin extends Plugin {
  constructor() {
    super({
      title: "openai",
      version: "0.9.1",
      package: "@livekit/agents-plugin-openai"
    });
  }
}
Plugin.registerPlugin(new OpenAIPlugin());
export {
  ChunkedStream,
  LLM,
  LLMStream,
  STT,
  TTS,
  realtime
};
//# sourceMappingURL=index.js.map