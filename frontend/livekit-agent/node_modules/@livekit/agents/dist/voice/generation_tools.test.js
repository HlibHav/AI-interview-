import { ReadableStream as NodeReadableStream } from "stream/web";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { FunctionCall, tool } from "../llm/index.js";
import { initializeLogger } from "../log.js";
import { cancelAndWait, delay } from "../utils.js";
import { performTextForwarding, performToolExecutions } from "./generation.js";
function createStringStream(chunks, delayMs = 0) {
  return new NodeReadableStream({
    async start(controller) {
      for (const c of chunks) {
        if (delayMs > 0) {
          await delay(delayMs);
        }
        controller.enqueue(c);
      }
      controller.close();
    }
  });
}
function createFunctionCallStream(fc) {
  return new NodeReadableStream({
    start(controller) {
      controller.enqueue(fc);
      controller.close();
    }
  });
}
function createFunctionCallStreamFromArray(fcs) {
  return new NodeReadableStream({
    start(controller) {
      for (const fc of fcs) {
        controller.enqueue(fc);
      }
      controller.close();
    }
  });
}
describe("Generation + Tool Execution", () => {
  initializeLogger({ pretty: false, level: "silent" });
  it("should not abort tool when preamble forwarders are cleaned up", async () => {
    var _a, _b;
    const replyAbortController = new AbortController();
    const forwarderController = new AbortController();
    const chunks = Array.from({ length: 50 }, () => `Hi.`);
    const fullPreambleText = chunks.join("");
    const preamble = createStringStream(chunks, 20);
    const [textForwardTask, textOut] = performTextForwarding(
      preamble,
      forwarderController,
      null
    );
    let toolAborted = false;
    const getWeather = tool({
      description: "weather",
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }, { abortSignal }) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            toolAborted = true;
          });
        }
        await delay(6e3);
        return `Sunny in ${location}`;
      }
    });
    const fc = FunctionCall.create({
      callId: "call_1",
      name: "getWeather",
      args: JSON.stringify({ location: "San Francisco" })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = performToolExecutions({
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
    await delay(100);
    await cancelAndWait([textForwardTask], 5e3);
    await execTask.result;
    expect(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    expect((_a = out.toolCallOutput) == null ? void 0 : _a.isError).toBe(false);
    expect((_b = out.toolCallOutput) == null ? void 0 : _b.output).toContain("Sunny in San Francisco");
    expect(textOut.text).not.toBe(fullPreambleText);
    expect(toolAborted).toBe(false);
  }, 3e4);
  it("should return basic tool execution output", async () => {
    var _a, _b;
    const replyAbortController = new AbortController();
    const echo = tool({
      description: "echo",
      parameters: z.object({ msg: z.string() }),
      execute: async ({ msg }) => `echo: ${msg}`
    });
    const fc = FunctionCall.create({
      callId: "call_2",
      name: "echo",
      args: JSON.stringify({ msg: "hello" })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = performToolExecutions({
      session: {},
      speechHandle: { id: "speech_test2", _itemAdded: () => {
      } },
      toolCtx: { echo },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    expect(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    expect((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(false);
    expect((_b = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _b.output).toContain("echo: hello");
  });
  it("should abort tool when reply is aborted mid-execution", async () => {
    var _a;
    const replyAbortController = new AbortController();
    let aborted = false;
    const longOp = tool({
      description: "longOp",
      parameters: z.object({ ms: z.number() }),
      execute: async ({ ms }, { abortSignal }) => {
        if (abortSignal) {
          abortSignal.addEventListener("abort", () => {
            aborted = true;
          });
        }
        await delay(ms);
        return "done";
      }
    });
    const fc = FunctionCall.create({
      callId: "call_abort_1",
      name: "longOp",
      args: JSON.stringify({ ms: 5e3 })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = performToolExecutions({
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
    expect(aborted).toBe(true);
    expect(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    expect((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(true);
  }, 2e4);
  it("should return error output on invalid tool args (zod validation failure)", async () => {
    var _a;
    const replyAbortController = new AbortController();
    const echo = tool({
      description: "echo",
      parameters: z.object({ msg: z.string() }),
      execute: async ({ msg }) => `echo: ${msg}`
    });
    const fc = FunctionCall.create({
      callId: "call_invalid_args",
      name: "echo",
      args: JSON.stringify({ msg: 123 })
    });
    const toolCallStream = createFunctionCallStream(fc);
    const [execTask, toolOutput] = performToolExecutions({
      session: {},
      speechHandle: { id: "speech_invalid", _itemAdded: () => {
      } },
      toolCtx: { echo },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    expect(toolOutput.output.length).toBe(1);
    const out = toolOutput.output[0];
    expect((_a = out == null ? void 0 : out.toolCallOutput) == null ? void 0 : _a.isError).toBe(true);
  });
  it("should handle multiple tool calls within a single stream", async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    const replyAbortController = new AbortController();
    const sum = tool({
      description: "sum",
      parameters: z.object({ a: z.number(), b: z.number() }),
      execute: async ({ a, b }) => a + b
    });
    const upper = tool({
      description: "upper",
      parameters: z.object({ s: z.string() }),
      execute: async ({ s }) => s.toUpperCase()
    });
    const fc1 = FunctionCall.create({
      callId: "call_multi_1",
      name: "sum",
      args: JSON.stringify({ a: 2, b: 3 })
    });
    const fc2 = FunctionCall.create({
      callId: "call_multi_2",
      name: "upper",
      args: JSON.stringify({ s: "hey" })
    });
    const toolCallStream = createFunctionCallStreamFromArray([fc1, fc2]);
    const [execTask, toolOutput] = performToolExecutions({
      session: {},
      speechHandle: { id: "speech_multi", _itemAdded: () => {
      } },
      toolCtx: { sum, upper },
      toolCallStream,
      controller: replyAbortController
    });
    await execTask.result;
    expect(toolOutput.output.length).toBe(2);
    const sorted = [...toolOutput.output].sort(
      (a, b) => a.toolCall.callId.localeCompare(b.toolCall.callId)
    );
    expect((_a = sorted[0]) == null ? void 0 : _a.toolCall.name).toBe("sum");
    expect((_c = (_b = sorted[0]) == null ? void 0 : _b.toolCallOutput) == null ? void 0 : _c.isError).toBe(false);
    expect((_e = (_d = sorted[0]) == null ? void 0 : _d.toolCallOutput) == null ? void 0 : _e.output).toBe("5");
    expect((_f = sorted[1]) == null ? void 0 : _f.toolCall.name).toBe("upper");
    expect((_h = (_g = sorted[1]) == null ? void 0 : _g.toolCallOutput) == null ? void 0 : _h.isError).toBe(false);
    expect((_j = (_i = sorted[1]) == null ? void 0 : _i.toolCallOutput) == null ? void 0 : _j.output).toBe('"HEY"');
  });
});
//# sourceMappingURL=generation_tools.test.js.map