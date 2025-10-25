import { tts } from "@livekit/agents-plugins-test";
import { describe } from "vitest";
import { STT } from "./stt.js";
import { TTS } from "./tts.js";
describe("OpenAI", async () => {
  await tts(new TTS(), new STT(), { streaming: false });
});
//# sourceMappingURL=tts.test.js.map