"use strict";
var import_agents_plugin_silero = require("@livekit/agents-plugin-silero");
var import_agents_plugins_test = require("@livekit/agents-plugins-test");
var import_vitest = require("vitest");
var import_stt = require("./stt.cjs");
(0, import_vitest.describe)("OpenAI", async () => {
  await (0, import_agents_plugins_test.stt)(new import_stt.STT(), await import_agents_plugin_silero.VAD.load(), { streaming: false });
});
//# sourceMappingURL=stt.test.cjs.map