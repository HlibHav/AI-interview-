import OpenAI from "openai";
import {
  APIConnectionError,
  APIStatusError,
  APITimeoutError,
  DEFAULT_API_CONNECT_OPTIONS,
  toError
} from "../index.js";
import * as llm from "../llm/index.js";
import { createAccessToken } from "./utils.js";
const DEFAULT_BASE_URL = "https://agent-gateway.livekit.cloud/v1";
class LLM extends llm.LLM {
  client;
  opts;
  constructor(opts) {
    super();
    const { model, provider, baseURL, apiKey, apiSecret, modelOptions } = opts;
    const lkBaseURL = baseURL || process.env.LIVEKIT_INFERENCE_URL || DEFAULT_BASE_URL;
    const lkApiKey = apiKey || process.env.LIVEKIT_INFERENCE_API_KEY || process.env.LIVEKIT_API_KEY;
    if (!lkApiKey) {
      throw new Error("apiKey is required: pass apiKey or set LIVEKIT_API_KEY");
    }
    const lkApiSecret = apiSecret || process.env.LIVEKIT_INFERENCE_API_SECRET || process.env.LIVEKIT_API_SECRET;
    if (!lkApiSecret) {
      throw new Error("apiSecret is required: pass apiSecret or set LIVEKIT_API_SECRET");
    }
    this.opts = {
      model,
      provider,
      baseURL: lkBaseURL,
      apiKey: lkApiKey,
      apiSecret: lkApiSecret,
      modelOptions: modelOptions || {}
    };
    this.client = new OpenAI({
      baseURL: this.opts.baseURL,
      apiKey: "",
      // leave a temporary empty string to avoid OpenAI complain about missing key
      timeout: 15e3
    });
  }
  label() {
    return "inference.LLM";
  }
  get model() {
    return this.opts.model;
  }
  static fromModelString(modelString) {
    return new LLM({ model: modelString });
  }
  chat({
    chatCtx,
    toolCtx,
    connOptions = DEFAULT_API_CONNECT_OPTIONS,
    parallelToolCalls,
    toolChoice,
    // TODO(AJS-270): Add response_format parameter support
    extraKwargs
  }) {
    let modelOptions = { ...extraKwargs || {} };
    parallelToolCalls = parallelToolCalls !== void 0 ? parallelToolCalls : this.opts.modelOptions.parallel_tool_calls;
    if (toolCtx && Object.keys(toolCtx).length > 0 && parallelToolCalls !== void 0) {
      modelOptions.parallel_tool_calls = parallelToolCalls;
    }
    toolChoice = toolChoice !== void 0 ? toolChoice : this.opts.modelOptions.tool_choice;
    if (toolChoice) {
      modelOptions.tool_choice = toolChoice;
    }
    modelOptions = { ...modelOptions, ...this.opts.modelOptions };
    return new LLMStream(this, {
      model: this.opts.model,
      provider: this.opts.provider,
      client: this.client,
      chatCtx,
      toolCtx,
      connOptions,
      modelOptions,
      gatewayOptions: {
        apiKey: this.opts.apiKey,
        apiSecret: this.opts.apiSecret
      }
    });
  }
}
class LLMStream extends llm.LLMStream {
  model;
  provider;
  providerFmt;
  client;
  modelOptions;
  gatewayOptions;
  toolCallId;
  toolIndex;
  fncName;
  fncRawArguments;
  constructor(llm2, {
    model,
    provider,
    client,
    chatCtx,
    toolCtx,
    gatewayOptions,
    connOptions,
    modelOptions,
    providerFmt
  }) {
    super(llm2, { chatCtx, toolCtx, connOptions });
    this.client = client;
    this.gatewayOptions = gatewayOptions;
    this.provider = provider;
    this.providerFmt = providerFmt || "openai";
    this.modelOptions = modelOptions;
    this.model = model;
  }
  async run() {
    var _a;
    let retryable = true;
    this.toolCallId = this.fncName = this.fncRawArguments = this.toolIndex = void 0;
    try {
      const messages = await this.chatCtx.toProviderFormat(
        this.providerFmt
      );
      const tools = this.toolCtx ? Object.entries(this.toolCtx).map(([name, func]) => ({
        type: "function",
        function: {
          name,
          description: func.description,
          parameters: llm.toJsonSchema(
            func.parameters
          )
        }
      })) : void 0;
      const requestOptions = { ...this.modelOptions };
      if (!tools) {
        delete requestOptions.tool_choice;
      }
      if (this.gatewayOptions) {
        this.client.apiKey = await createAccessToken(
          this.gatewayOptions.apiKey,
          this.gatewayOptions.apiSecret
        );
      }
      if (this.provider) {
        const extraHeaders = requestOptions.extra_headers ? requestOptions.extra_headers : {};
        extraHeaders["X-LiveKit-Inference-Provider"] = this.provider;
        requestOptions.extra_headers = extraHeaders;
      }
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages,
          tools,
          stream: true,
          stream_options: { include_usage: true },
          ...requestOptions
        },
        {
          timeout: this.connOptions.timeoutMs
        }
      );
      for await (const chunk of stream) {
        for (const choice of chunk.choices) {
          if (this.abortController.signal.aborted) {
            break;
          }
          const chatChunk = this.parseChoice(chunk.id, choice);
          if (chatChunk) {
            retryable = false;
            this.queue.put(chatChunk);
          }
        }
        if (chunk.usage) {
          const usage = chunk.usage;
          retryable = false;
          this.queue.put({
            id: chunk.id,
            usage: {
              completionTokens: usage.completion_tokens,
              promptTokens: usage.prompt_tokens,
              promptCachedTokens: ((_a = usage.prompt_tokens_details) == null ? void 0 : _a.cached_tokens) || 0,
              totalTokens: usage.total_tokens
            }
          });
        }
      }
    } catch (error) {
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new APITimeoutError({ options: { retryable } });
      } else if (error instanceof OpenAI.APIError) {
        throw new APIStatusError({
          message: error.message,
          options: {
            statusCode: error.status,
            body: error.error,
            requestId: error.request_id,
            retryable
          }
        });
      } else {
        throw new APIConnectionError({
          message: toError(error).message,
          options: { retryable }
        });
      }
    } finally {
      this.queue.close();
    }
  }
  parseChoice(id, choice) {
    const delta = choice.delta;
    if (delta === void 0) return void 0;
    if (delta.tool_calls) {
      for (const tool of delta.tool_calls) {
        if (!tool.function) {
          continue;
        }
        let callChunk;
        if (this.toolCallId && tool.id && tool.index !== this.toolIndex) {
          callChunk = this.createRunningToolCallChunk(id, delta);
          this.toolCallId = this.fncName = this.fncRawArguments = void 0;
        }
        if (tool.function.name) {
          this.toolIndex = tool.index;
          this.toolCallId = tool.id;
          this.fncName = tool.function.name;
          this.fncRawArguments = tool.function.arguments || "";
        } else if (tool.function.arguments) {
          this.fncRawArguments = (this.fncRawArguments || "") + tool.function.arguments;
        }
        if (callChunk) {
          return callChunk;
        }
      }
    }
    if (choice.finish_reason && ["tool_calls", "stop"].includes(choice.finish_reason) && this.toolCallId !== void 0) {
      const callChunk = this.createRunningToolCallChunk(id, delta);
      this.toolCallId = this.fncName = this.fncRawArguments = void 0;
      return callChunk;
    }
    if (!delta.content) {
      return void 0;
    }
    return {
      id,
      delta: {
        role: "assistant",
        content: delta.content
      }
    };
  }
  createRunningToolCallChunk(id, delta) {
    return {
      id,
      delta: {
        role: "assistant",
        content: delta.content || void 0,
        toolCalls: [
          llm.FunctionCall.create({
            callId: this.toolCallId || "",
            name: this.fncName || "",
            args: this.fncRawArguments || ""
          })
        ]
      }
    };
  }
}
export {
  LLM,
  LLMStream
};
//# sourceMappingURL=llm.js.map