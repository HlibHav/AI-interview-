"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var generation_exports = {};
__export(generation_exports, {
  ToolExecutionOutput: () => ToolExecutionOutput,
  _JsOutput: () => _JsOutput,
  _LLMGenerationData: () => _LLMGenerationData,
  _SanitizedOutput: () => _SanitizedOutput,
  _ToolOutput: () => _ToolOutput,
  createToolOutput: () => createToolOutput,
  performAudioForwarding: () => performAudioForwarding,
  performLLMInference: () => performLLMInference,
  performTTSInference: () => performTTSInference,
  performTextForwarding: () => performTextForwarding,
  performToolExecutions: () => performToolExecutions,
  removeInstructions: () => removeInstructions,
  updateInstructions: () => updateInstructions
});
module.exports = __toCommonJS(generation_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_zod = require("zod");
var import_chat_context = require("../llm/chat_context.cjs");
var import_tool_context = require("../llm/tool_context.cjs");
var import_log = require("../log.cjs");
var import_identity_transform = require("../stream/identity_transform.cjs");
var import_utils = require("../utils.cjs");
var import_agent = require("./agent.cjs");
var import_run_context = require("./run_context.cjs");
class _LLMGenerationData {
  constructor(textStream, toolCallStream) {
    this.textStream = textStream;
    this.toolCallStream = toolCallStream;
    this.id = (0, import_utils.shortuuid)("item_");
    this.generatedToolCalls = [];
  }
  generatedText = "";
  generatedToolCalls;
  id;
}
class _ToolOutput {
  output;
  firstToolFut;
  constructor() {
    this.output = [];
    this.firstToolFut = new import_utils.Future();
  }
}
class _SanitizedOutput {
  toolCall;
  toolCallOutput;
  replyRequired;
  agentTask;
  constructor(toolCall, toolCallOutput, replyRequired, agentTask) {
    this.toolCall = toolCall;
    this.toolCallOutput = toolCallOutput;
    this.replyRequired = replyRequired;
    this.agentTask = agentTask;
  }
  static create(params) {
    const { toolCall, toolCallOutput, replyRequired = true, agentTask } = params;
    return new _SanitizedOutput(toolCall, toolCallOutput, replyRequired, agentTask);
  }
}
function isValidToolOutput(toolOutput) {
  const validTypes = ["string", "number", "boolean"];
  if (validTypes.includes(typeof toolOutput)) {
    return true;
  }
  if (toolOutput === void 0 || toolOutput === null) {
    return true;
  }
  if (Array.isArray(toolOutput)) {
    return toolOutput.every(isValidToolOutput);
  }
  if (toolOutput instanceof Set) {
    return Array.from(toolOutput).every(isValidToolOutput);
  }
  if (toolOutput instanceof Map) {
    return Array.from(toolOutput.values()).every(isValidToolOutput);
  }
  if (toolOutput instanceof Object) {
    return Object.entries(toolOutput).every(
      ([key, value]) => validTypes.includes(typeof key) && isValidToolOutput(value)
    );
  }
  return false;
}
class ToolExecutionOutput {
  constructor(toolCall, toolCallOutput, agentTask, rawOutput, rawException, replyRequired) {
    this.toolCall = toolCall;
    this.toolCallOutput = toolCallOutput;
    this.agentTask = agentTask;
    this.rawOutput = rawOutput;
    this.rawException = rawException;
    this.replyRequired = replyRequired;
  }
  static create(params) {
    const {
      toolCall,
      toolCallOutput,
      agentTask,
      rawOutput,
      rawException,
      replyRequired = true
    } = params;
    return new ToolExecutionOutput(
      toolCall,
      toolCallOutput,
      agentTask,
      rawOutput,
      rawException,
      replyRequired
    );
  }
}
class _JsOutput {
  toolCall;
  output;
  exception;
  #logger = (0, import_log.log)();
  constructor(toolCall, output, exception) {
    this.toolCall = toolCall;
    this.output = output;
    this.exception = exception;
  }
  static create(params) {
    const { toolCall, output = void 0, exception = void 0 } = params;
    return new _JsOutput(toolCall, output, exception);
  }
  sanitize() {
    if ((0, import_tool_context.isToolError)(this.exception)) {
      return _SanitizedOutput.create({
        toolCall: import_chat_context.FunctionCall.create({ ...this.toolCall }),
        toolCallOutput: import_chat_context.FunctionCallOutput.create({
          name: this.toolCall.name,
          callId: this.toolCall.callId,
          output: this.exception.message,
          isError: true
        })
      });
    }
    if ((0, import_agent.isStopResponse)(this.exception)) {
      return _SanitizedOutput.create({
        toolCall: import_chat_context.FunctionCall.create({ ...this.toolCall })
      });
    }
    if (this.exception !== void 0) {
      return _SanitizedOutput.create({
        toolCall: import_chat_context.FunctionCall.create({ ...this.toolCall }),
        toolCallOutput: import_chat_context.FunctionCallOutput.create({
          name: this.toolCall.name,
          callId: this.toolCall.callId,
          output: "An internal error occurred while executing the tool.",
          // Don't send the actual error message, as it may contain sensitive information
          isError: true
        })
      });
    }
    let agentTask = void 0;
    let toolOutput = this.output;
    if ((0, import_tool_context.isAgentHandoff)(this.output)) {
      agentTask = this.output.agent;
      toolOutput = this.output.returns;
    }
    if (!isValidToolOutput(toolOutput)) {
      this.#logger.error(
        {
          callId: this.toolCall.callId,
          function: this.toolCall.name
        },
        `AI function ${this.toolCall.name} returned an invalid output`
      );
      return _SanitizedOutput.create({
        toolCall: import_chat_context.FunctionCall.create({ ...this.toolCall }),
        toolCallOutput: void 0
      });
    }
    return _SanitizedOutput.create({
      toolCall: import_chat_context.FunctionCall.create({ ...this.toolCall }),
      toolCallOutput: import_chat_context.FunctionCallOutput.create({
        name: this.toolCall.name,
        callId: this.toolCall.callId,
        output: toolOutput !== void 0 ? JSON.stringify(toolOutput) : "",
        // take the string representation of the output
        isError: false
      }),
      replyRequired: toolOutput !== void 0,
      // require a reply if the tool returned an output
      agentTask
    });
  }
}
function createToolOutput(params) {
  const { toolCall, output, exception } = params;
  const logger = (0, import_log.log)();
  let finalOutput = output;
  let finalException = exception;
  if (output instanceof Error) {
    finalException = output;
    finalOutput = void 0;
  }
  if ((0, import_tool_context.isToolError)(finalException)) {
    return ToolExecutionOutput.create({
      toolCall: import_chat_context.FunctionCall.create({ ...toolCall }),
      toolCallOutput: import_chat_context.FunctionCallOutput.create({
        name: toolCall.name,
        callId: toolCall.callId,
        output: finalException.message,
        isError: true
      }),
      rawOutput: finalOutput,
      rawException: finalException
    });
  }
  if ((0, import_agent.isStopResponse)(finalException)) {
    return ToolExecutionOutput.create({
      toolCall: import_chat_context.FunctionCall.create({ ...toolCall }),
      rawOutput: finalOutput,
      rawException: finalException
    });
  }
  if (finalException !== void 0) {
    return ToolExecutionOutput.create({
      toolCall: import_chat_context.FunctionCall.create({ ...toolCall }),
      toolCallOutput: import_chat_context.FunctionCallOutput.create({
        name: toolCall.name,
        callId: toolCall.callId,
        output: "An internal error occurred",
        // Don't send the actual error message, as it may contain sensitive information
        isError: true
      }),
      rawOutput: finalOutput,
      rawException: finalException
    });
  }
  let agentTask = void 0;
  let toolOutput = finalOutput;
  if ((0, import_tool_context.isAgentHandoff)(finalOutput)) {
    agentTask = finalOutput.agent;
    toolOutput = finalOutput.returns;
  }
  if (!isValidToolOutput(toolOutput)) {
    logger.error(
      {
        callId: toolCall.callId,
        output: finalOutput
      },
      `AI function ${toolCall.name} returned an invalid output`
    );
    return ToolExecutionOutput.create({
      toolCall: import_chat_context.FunctionCall.create({ ...toolCall }),
      rawOutput: finalOutput,
      rawException: finalException
    });
  }
  return ToolExecutionOutput.create({
    toolCall: import_chat_context.FunctionCall.create({ ...toolCall }),
    toolCallOutput: import_chat_context.FunctionCallOutput.create({
      name: toolCall.name,
      callId: toolCall.callId,
      output: toolOutput !== void 0 ? JSON.stringify(toolOutput) : "",
      // take the string representation of the output
      isError: false
    }),
    replyRequired: toolOutput !== void 0,
    // require a reply if the tool returned an output
    agentTask,
    rawOutput: finalOutput,
    rawException: finalException
  });
}
const INSTRUCTIONS_MESSAGE_ID = "lk.agent_task.instructions";
function updateInstructions(options) {
  const { chatCtx, instructions, addIfMissing } = options;
  const idx = chatCtx.indexById(INSTRUCTIONS_MESSAGE_ID);
  if (idx !== void 0) {
    if (chatCtx.items[idx].type === "message") {
      chatCtx.items[idx] = import_chat_context.ChatMessage.create({
        id: INSTRUCTIONS_MESSAGE_ID,
        role: "system",
        content: [instructions],
        createdAt: chatCtx.items[idx].createdAt
      });
    } else {
      throw new Error('expected the instructions inside the chatCtx to be of type "message"');
    }
  } else if (addIfMissing) {
    chatCtx.items.unshift(
      import_chat_context.ChatMessage.create({
        id: INSTRUCTIONS_MESSAGE_ID,
        role: "system",
        content: [instructions]
      })
    );
  }
}
function performLLMInference(node, chatCtx, toolCtx, modelSettings, controller) {
  const textStream = new import_identity_transform.IdentityTransform();
  const toolCallStream = new import_identity_transform.IdentityTransform();
  const textWriter = textStream.writable.getWriter();
  const toolCallWriter = toolCallStream.writable.getWriter();
  const data = new _LLMGenerationData(textStream.readable, toolCallStream.readable);
  const inferenceTask = async (signal) => {
    let llmStreamReader = null;
    let llmStream = null;
    try {
      llmStream = await node(chatCtx, toolCtx, modelSettings);
      if (llmStream === null) {
        await textWriter.close();
        return;
      }
      llmStreamReader = llmStream.getReader();
      while (true) {
        if (signal.aborted) {
          break;
        }
        const { done, value: chunk } = await llmStreamReader.read();
        if (done) {
          break;
        }
        if (typeof chunk === "string") {
          data.generatedText += chunk;
          await textWriter.write(chunk);
        } else {
          if (chunk.delta === void 0) {
            continue;
          }
          if (chunk.delta.toolCalls) {
            for (const tool of chunk.delta.toolCalls) {
              if (tool.type !== "function_call") continue;
              const toolCall = import_chat_context.FunctionCall.create({
                callId: `${data.id}/fnc_${data.generatedToolCalls.length}`,
                name: tool.name,
                args: tool.args
              });
              data.generatedToolCalls.push(toolCall);
              await toolCallWriter.write(toolCall);
            }
          }
          if (chunk.delta.content) {
            data.generatedText += chunk.delta.content;
            await textWriter.write(chunk.delta.content);
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    } finally {
      llmStreamReader == null ? void 0 : llmStreamReader.releaseLock();
      await (llmStream == null ? void 0 : llmStream.cancel());
      await textWriter.close();
      await toolCallWriter.close();
    }
  };
  return [
    import_utils.Task.from((controller2) => inferenceTask(controller2.signal), controller, "performLLMInference"),
    data
  ];
}
function performTTSInference(node, text, modelSettings, controller) {
  const audioStream = new import_identity_transform.IdentityTransform();
  const outputWriter = audioStream.writable.getWriter();
  const audioOutputStream = audioStream.readable;
  const inferenceTask = async (signal) => {
    let ttsStreamReader = null;
    let ttsStream = null;
    try {
      ttsStream = await node(text, modelSettings);
      if (ttsStream === null) {
        await outputWriter.close();
        return;
      }
      ttsStreamReader = ttsStream.getReader();
      while (true) {
        if (signal.aborted) {
          break;
        }
        const { done, value: chunk } = await ttsStreamReader.read();
        if (done) {
          break;
        }
        await outputWriter.write(chunk);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      throw error;
    } finally {
      ttsStreamReader == null ? void 0 : ttsStreamReader.releaseLock();
      await (ttsStream == null ? void 0 : ttsStream.cancel());
      await outputWriter.close();
    }
  };
  return [
    import_utils.Task.from((controller2) => inferenceTask(controller2.signal), controller, "performTTSInference"),
    audioOutputStream
  ];
}
async function forwardText(source, out, signal, textOutput) {
  const reader = source.getReader();
  try {
    while (true) {
      if (signal.aborted) {
        break;
      }
      const { done, value: delta } = await reader.read();
      if (done) break;
      out.text += delta;
      if (textOutput !== null) {
        await textOutput.captureText(delta);
      }
      if (!out.firstTextFut.done) {
        out.firstTextFut.resolve();
      }
    }
  } finally {
    if (textOutput !== null) {
      textOutput.flush();
    }
    reader == null ? void 0 : reader.releaseLock();
  }
}
function performTextForwarding(source, controller, textOutput) {
  const out = {
    text: "",
    firstTextFut: new import_utils.Future()
  };
  return [
    import_utils.Task.from(
      (controller2) => forwardText(source, out, controller2.signal, textOutput),
      controller,
      "performTextForwarding"
    ),
    out
  ];
}
async function forwardAudio(ttsStream, audioOuput, out, signal) {
  const reader = ttsStream.getReader();
  let resampler = null;
  try {
    while (true) {
      if (signal == null ? void 0 : signal.aborted) {
        break;
      }
      const { done, value: frame } = await reader.read();
      if (done) break;
      out.audio.push(frame);
      if (!out.firstFrameFut.done && audioOuput.sampleRate && audioOuput.sampleRate !== frame.sampleRate && !resampler) {
        resampler = new import_rtc_node.AudioResampler(frame.sampleRate, audioOuput.sampleRate, 1);
      }
      if (resampler) {
        for (const f of resampler.push(frame)) {
          await audioOuput.captureFrame(f);
        }
      } else {
        await audioOuput.captureFrame(frame);
      }
      if (!out.firstFrameFut.done) {
        out.firstFrameFut.resolve();
      }
    }
  } finally {
    reader == null ? void 0 : reader.releaseLock();
    if (resampler) {
      for (const f of resampler.flush()) {
        await audioOuput.captureFrame(f);
      }
    }
    audioOuput.flush();
  }
}
function performAudioForwarding(ttsStream, audioOutput, controller) {
  const out = {
    audio: [],
    firstFrameFut: new import_utils.Future()
  };
  return [
    import_utils.Task.from(
      (controller2) => forwardAudio(ttsStream, audioOutput, out, controller2.signal),
      controller,
      "performAudioForwarding"
    ),
    out
  ];
}
function performToolExecutions({
  session,
  speechHandle,
  toolCtx,
  toolChoice,
  toolCallStream,
  onToolExecutionStarted = () => {
  },
  onToolExecutionCompleted = () => {
  },
  controller
}) {
  const logger = (0, import_log.log)();
  const toolOutput = {
    output: [],
    firstToolStartedFuture: new import_utils.Future()
  };
  const toolCompleted = (out) => {
    onToolExecutionCompleted(out);
    toolOutput.output.push(out);
  };
  const executeToolsTask = async (controller2) => {
    const signal = controller2.signal;
    const reader = toolCallStream.getReader();
    const tasks = [];
    while (!signal.aborted) {
      const { done, value: toolCall } = await reader.read();
      if (signal.aborted) break;
      if (done) break;
      if (toolChoice === "none") {
        logger.error(
          {
            function: toolCall.name,
            speech_id: speechHandle.id
          },
          "received a tool call with toolChoice set to 'none', ignoring"
        );
        continue;
      }
      const tool = toolCtx[toolCall.name];
      if (!tool) {
        logger.warn(
          {
            function: toolCall.name,
            speech_id: speechHandle.id
          },
          `unknown AI function ${toolCall.name}`
        );
        continue;
      }
      if (!(0, import_tool_context.isFunctionTool)(tool)) {
        logger.error(
          {
            function: toolCall.name,
            speech_id: speechHandle.id
          },
          `unknown tool type: ${typeof tool}`
        );
        continue;
      }
      let parsedArgs;
      try {
        const jsonArgs = JSON.parse(toolCall.args);
        if (tool.parameters instanceof import_zod.ZodObject) {
          parsedArgs = tool.parameters.parse(jsonArgs);
        } else {
          parsedArgs = jsonArgs;
        }
      } catch (rawError) {
        const error = (0, import_utils.toError)(rawError);
        logger.error(
          {
            function: toolCall.name,
            arguments: toolCall.args,
            speech_id: speechHandle.id,
            error: error.message
          },
          `tried to call AI function ${toolCall.name} with invalid arguments`
        );
        toolCompleted(
          createToolOutput({
            toolCall,
            exception: error
          })
        );
        continue;
      }
      if (!toolOutput.firstToolStartedFuture.done) {
        toolOutput.firstToolStartedFuture.resolve();
      }
      onToolExecutionStarted(toolCall);
      logger.info(
        {
          function: toolCall.name,
          arguments: parsedArgs,
          speech_id: speechHandle.id
        },
        "Executing LLM tool call"
      );
      const toolExecution = import_agent.asyncLocalStorage.run({ functionCall: toolCall }, async () => {
        return await tool.execute(parsedArgs, {
          ctx: new import_run_context.RunContext(session, speechHandle, toolCall),
          toolCallId: toolCall.callId,
          abortSignal: signal
        });
      });
      const tracableToolExecution = async (toolExecTask) => {
        let toolOutput2;
        try {
          const { result, isAborted } = await waitUntilAborted(toolExecTask, signal);
          toolOutput2 = createToolOutput({
            toolCall,
            exception: isAborted ? new Error("tool call was aborted") : void 0,
            output: isAborted ? void 0 : result
          });
        } catch (rawError) {
          logger.error(
            {
              function: toolCall.name,
              speech_id: speechHandle.id,
              error: (0, import_utils.toError)(rawError).message
            },
            "exception occurred while executing tool"
          );
          toolOutput2 = createToolOutput({
            toolCall,
            exception: (0, import_utils.toError)(rawError)
          });
        } finally {
          if (!toolOutput2) throw new Error("toolOutput is undefined");
          toolCompleted(toolOutput2);
        }
      };
      tasks.push(tracableToolExecution(toolExecution));
    }
    await Promise.allSettled(tasks);
    if (toolOutput.output.length > 0) {
      logger.debug(
        {
          speech_id: speechHandle.id
        },
        "tools execution completed"
      );
    }
  };
  return [import_utils.Task.from(executeToolsTask, controller, "performToolExecutions"), toolOutput];
}
async function waitUntilAborted(promise, signal) {
  const abortFut = new import_utils.Future();
  const resolveAbort = () => {
    if (!abortFut.done) {
      abortFut.resolve({ result: void 0, isAborted: true });
    }
  };
  signal.addEventListener("abort", resolveAbort);
  promise.then((r) => {
    if (!abortFut.done) {
      abortFut.resolve({ result: r, isAborted: false });
    }
  }).catch((e) => {
    if (!abortFut.done) {
      abortFut.reject(e);
    }
  }).finally(() => {
    signal.removeEventListener("abort", resolveAbort);
  });
  return await abortFut.await;
}
function removeInstructions(chatCtx) {
  while (true) {
    const idx = chatCtx.indexById(INSTRUCTIONS_MESSAGE_ID);
    if (idx !== void 0) {
      chatCtx.items.splice(idx, 1);
    } else {
      break;
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ToolExecutionOutput,
  _JsOutput,
  _LLMGenerationData,
  _SanitizedOutput,
  _ToolOutput,
  createToolOutput,
  performAudioForwarding,
  performLLMInference,
  performTTSInference,
  performTextForwarding,
  performToolExecutions,
  removeInstructions,
  updateInstructions
});
//# sourceMappingURL=generation.cjs.map