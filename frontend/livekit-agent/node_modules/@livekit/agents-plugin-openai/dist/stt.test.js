import { VAD } from "@livekit/agents-plugin-silero";
import { stt } from "@livekit/agents-plugins-test";
import { describe } from "vitest";
import { STT } from "./stt.js";
describe("OpenAI", async () => {
  await stt(new STT(), await VAD.load(), { streaming: false });
});
//# sourceMappingURL=stt.test.js.map