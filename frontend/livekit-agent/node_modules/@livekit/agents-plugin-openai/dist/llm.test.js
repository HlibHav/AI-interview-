import { llm } from "@livekit/agents-plugins-test";
import { describe } from "vitest";
import { LLM } from "./llm.js";
describe("OpenAI", async () => {
  await llm(
    new LLM({
      temperature: 0
    })
  );
});
//# sourceMappingURL=llm.test.js.map