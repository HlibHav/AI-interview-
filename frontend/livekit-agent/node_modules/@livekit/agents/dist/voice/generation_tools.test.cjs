"use strict";
var import_web = require("stream/web");
var import_vitest = require("vitest");
var import_zod = require("zod");
var import_llm = require("../llm/index.cjs");
var import_log = require("../log.cjs");
var import_utils = require("../utils.cjs");
var import_generation = require("./generation.cjs");
function createStringStream(chunks, delayMs = 0) {
  return new import_web.ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        if (delayMs > 0) {
          await (0, import_utils.delay)(delayMs);
        }
        controller.enqueue(c);
      }
      controller.close();
    }
  });
}
function createFunctionCallStream(fc) {
  return new import_web.ReadableStream({
    start(controller) {
      controller.enqueue(fc);
      controller.close();
    }
  });
}
function createFunctionCallStreamFromArray(fcs) {
  return new import_web.ReadableStream({
    start(controller) {
      for (const fc of fcs) {
        controller.enqueue(fc);
      }
      controller.close();
    }
  });
}
(0, import_vitest.describe)("Generation + Tool Execution", () => {
  (0, import_log.initializeLogger)({ pretty: false, level: "silent" });
  (0, import_vitest.it)("should not abort tool when preamble forwarders are cleaned up", async () => {
    var _a, _b;
    const replyAbortController = new AbortController();
    const forwarderController = new AbortController();
    const chunks = Array.from({ length: 50 }, () => `Hi.`);
    const fullPreambleText = chunks.join("");
    const preamble = createStringStream(chunks, 20);
    const [textForwardTask, textOut] = (0, import_generation.performTextForwarding)(
      preamble,
      forwarderController,
      null
    );
    let toolAborted = false;
    const getWeather = (0, import_llm.tool)({
      description: "weather",
      parameters: import_zod.z.object({ location: import_zod.z.string() }),
      execute: async ({ location }, { abortSignal }) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            toolAborted = true;
          });
        }
        await (0, import_utils.delay)(6e3);
        return `Sunny in ${location}`;
      }
    });
    const fc = import_llm.FunctionCall.create({
      callId: "call_1",
      name: "getWeather",
      args: JSON.stringify({ location: "San Francisco" })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = (0, import_generation.performToolExecutions)({
      session: {},
      speechHandle: { id: "speech_test", _itemAdded: () => {
      } },
      toolCtx: { getWeather },
      toolCallStream,
      controller: replyAbortController,
      onToolExecutionStarted: () => {
      },
      onToolExecutionCompleted: () => {
      }
    });
    await toolOutput.firstToolStartedFuture.await;
    await (0, import_utils.delay)(100);
    await (0, import_utils.cancelAndWait)([textForwardTask], 5e3);
    await execTask.result;
    (0, import_vitest.expect)(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    (0, import_vitest.expect)((_a = out.toolCallOutput) == null ? void 0 : _a.isError).toBe(false);
    (0, import_vitest.expect)((_b = out.toolCallOutput) == null ? void 0 : _b.output).toContain("Sunny in San Francisco");
    (0, import_vitest.expect)(textOut.text).not.toBe(fullPreambleText);
    (0, import_vitest.expect)(toolAborted).toBe(false);
  }, 3e4);
  (0, import_vitest.it)("should return basic tool execution output", async () => {
    var _a, _b;
    const replyAbortController = new AbortController();
    const echo = (0, import_llm.tool)({
      description: "echo",
      parameters: import_zod.z.object({ msg: import_zod.z.string() }),
      execute: async ({ msg }) => `echo: ${msg}`
    });
    const fc = import_llm.FunctionCall.create({
      callId: "call_2",
      name: "echo",
      args: JSON.stringify({ msg: "hello" })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = (0, import_generation.performToolExecutions)({
      session: {},
      speechHandle: { id: "speech_test2", _itemAdded: () => {
      } },
      toolCtx: { echo },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    (0, import_vitest.expect)(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    (0, import_vitest.expect)((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(false);
    (0, import_vitest.expect)((_b = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _b.output).toContain("echo: hello");
  });
  (0, import_vitest.it)("should abort tool when reply is aborted mid-execution", async () => {
    var _a;
    const replyAbortController = new AbortController();
    let aborted = false;
    const longOp = (0, import_llm.tool)({
      description: "longOp",
      parameters: import_zod.z.object({ ms: import_zod.z.number() }),
      execute: async ({ ms }, { abortSignal }) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            aborted = true;
          });
        }
        await (0, import_utils.delay)(ms);
        return "done";
      }
    });
    const fc = import_llm.FunctionCall.create({
      callId: "call_abort_1",
      name: "longOp",
      args: JSON.stringify({ ms: 5e3 })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = (0, import_generation.performToolExecutions)({
      session: {},
      speechHandle: { id: "speech_abort", _itemAdded: () => {
      } },
      toolCtx: { longOp },
      toolCallStream,
      controller: replyAbortController
    });
    await toolOutput.firstToolStartedFuture.await;
    replyAbortController.abort();
    await execTask.result;
    (0, import_vitest.expect)(aborted).toBe(true);
    (0, import_vitest.expect)(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    (0, import_vitest.expect)((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(true);
  }, 2e4);
  (0, import_vitest.it)("should return error output on invalid tool args (zod validation failure)", async () => {
    var _a;
    const replyAbortController = new AbortController();
    const echo = (0, import_llm.tool)({
      description: "echo",
      parameters: import_zod.z.object({ msg: import_zod.z.string() }),
      execute: async ({ msg }) => `echo: ${msg}`
    });
    const fc = import_llm.FunctionCall.create({
      callId: "call_invalid_args",
      name: "echo",
      args: JSON.stringify({ msg: 123 })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = (0, import_generation.performToolExecutions)({
      session: {},
      speechHandle: { id: "speech_invalid", _itemAdded: () => {
      } },
      toolCtx: { echo },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    (0, import_vitest.expect)(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    (0, import_vitest.expect)((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(true);
  });
  (0, import_vitest.it)("should handle multiple tool calls within a single stream", async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const replyAbortController = new AbortController();
    const sum = (0, import_llm.tool)({
      description: "sum",
      parameters: import_zod.z.object({ a: import_zod.z.number(), b: import_zod.z.number() }),
      execute: async ({ a, b }) => a + b
    });
    const upper = (0, import_llm.tool)({
      description: "upper",
      parameters: import_zod.z.object({ s: import_zod.z.string() }),
      execute: async ({ s }) => s.toUpperCase()
    });
    const fc1 = import_llm.FunctionCall.create({
      callId: "call_multi_1",
      name: "sum",
      args: JSON.stringify({ a: 2, b: 3 })
    });
    const fc2 = import_llm.FunctionCall.create({
      callId: "call_multi_2",
      name: "upper",
      args: JSON.stringify({ s: "hey" })
    });
    const toolCallStream = createFunctionCallStreamFromArray([fc1, fc2]);
    const [execTask, toolOutput] = (0, import_generation.performToolExecutions)({
      session: {},
      speechHandle: { id: "speech_multi", _itemAdded: () => {
      } },
      toolCtx: { sum, upper },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    (0, import_vitest.expect)(toolOutput.output.length).toBe(2);
    const sorted = [...toolOutput.output].sort(
      (a, b) => a.toolCall.callId.localeCompare(b.toolCall.callId)
    );
    (0, import_vitest.expect)((_a = sorted[0]) == null ? void 0 : _a.toolCall.name).toBe("sum");
    (0, import_vitest.expect)((_c = (_b = sorted[0]) == null ? void 0 : _b.toolCallOutput) == null ? void 0 : _c.isError).toBe(false);
    (0, import_vitest.expect)((_e = (_d = sorted[0]) == null ? void 0 : _d.toolCallOutput) == null ? void 0 : _e.output).toBe("5");
    (0, import_vitest.expect)((_f = sorted[1]) == null ? void 0 : _f.toolCall.name).toBe("upper");
    (0, import_vitest.expect)((_h = (_g = sorted[1]) == null ? void 0 : _g.toolCallOutput) == null ? void 0 : _h.isError).toBe(false);
    (0, import_vitest.expect)((_j = (_i = sorted[1]) == null ? void 0 : _i.toolCallOutput) == null ? void 0 : _j.output).toBe('"HEY"');
  });
});
//# sourceMappingURL=generation_tools.test.cjs.map