"use strict";
var import_agents_plugins_test = require("@livekit/agents-plugins-test");
var import_vitest = require("vitest");
var import_stt = require("./stt.cjs");
var import_tts = require("./tts.cjs");
(0, import_vitest.describe)("OpenAI", async () => {
  await (0, import_agents_plugins_test.tts)(new import_tts.TTS(), new import_stt.STT(), { streaming: false });
});
//# sourceMappingURL=tts.test.cjs.map