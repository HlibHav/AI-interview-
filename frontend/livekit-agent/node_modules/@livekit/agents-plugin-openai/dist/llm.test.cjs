"use strict";
var import_agents_plugins_test = require("@livekit/agents-plugins-test");
var import_vitest = require("vitest");
var import_llm = require("./llm.cjs");
(0, import_vitest.describe)("OpenAI", async () => {
  await (0, import_agents_plugins_test.llm)(
    new import_llm.LLM({
      temperature: 0
    })
  );
});
//# sourceMappingURL=llm.test.cjs.map