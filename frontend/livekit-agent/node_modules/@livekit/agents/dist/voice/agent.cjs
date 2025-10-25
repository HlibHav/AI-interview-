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
var agent_exports = {};
__export(agent_exports, {
  Agent: () => Agent,
  STOP_RESPONSE_SYMBOL: () => STOP_RESPONSE_SYMBOL,
  StopResponse: () => StopResponse,
  asyncLocalStorage: () => asyncLocalStorage,
  isStopResponse: () => isStopResponse
});
module.exports = __toCommonJS(agent_exports);
var import_node_async_hooks = require("node:async_hooks");
var import_web = require("node:stream/web");
var import_inference = require("../inference/index.cjs");
var import_chat_context = require("../llm/chat_context.cjs");
var import_llm = require("../llm/index.cjs");
var import_stt = require("../stt/index.cjs");
var import_basic = require("../tokenize/basic/index.cjs");
var import_tts = require("../tts/index.cjs");
const asyncLocalStorage = new import_node_async_hooks.AsyncLocalStorage();
const STOP_RESPONSE_SYMBOL = Symbol("StopResponse");
class StopResponse extends Error {
  constructor() {
    super();
    this.name = "StopResponse";
    Object.defineProperty(this, STOP_RESPONSE_SYMBOL, {
      value: true
    });
  }
}
function isStopResponse(value) {
  return value !== void 0 && value !== null && typeof value === "object" && STOP_RESPONSE_SYMBOL in value;
}
class Agent {
  turnDetection;
  _stt;
  _vad;
  _llm;
  _tts;
  /** @internal */
  _agentActivity;
  /** @internal */
  _chatCtx;
  /** @internal */
  _instructions;
  /** @internal */
  _tools;
  constructor({
    instructions,
    chatCtx,
    tools,
    turnDetection,
    stt,
    vad,
    llm,
    tts
  }) {
    this._instructions = instructions;
    this._tools = { ...tools };
    this._chatCtx = chatCtx ? chatCtx.copy({
      toolCtx: this._tools
    }) : import_llm.ChatContext.empty();
    this.turnDetection = turnDetection;
    this._vad = vad;
    if (typeof stt === "string") {
      this._stt = import_inference.STT.fromModelString(stt);
    } else {
      this._stt = stt;
    }
    if (typeof llm === "string") {
      this._llm = import_inference.LLM.fromModelString(llm);
    } else {
      this._llm = llm;
    }
    if (typeof tts === "string") {
      this._tts = import_inference.TTS.fromModelString(tts);
    } else {
      this._tts = tts;
    }
    this._agentActivity = void 0;
  }
  get vad() {
    return this._vad;
  }
  get stt() {
    return this._stt;
  }
  get llm() {
    return this._llm;
  }
  get tts() {
    return this._tts;
  }
  get chatCtx() {
    return new import_chat_context.ReadonlyChatContext(this._chatCtx.items);
  }
  get instructions() {
    return this._instructions;
  }
  get toolCtx() {
    return { ...this._tools };
  }
  get session() {
    return this.getActivityOrThrow().agentSession;
  }
  async onEnter() {
  }
  async onExit() {
  }
  async transcriptionNode(text, modelSettings) {
    return Agent.default.transcriptionNode(this, text, modelSettings);
  }
  async onUserTurnCompleted(_chatCtx, _newMessage) {
  }
  async sttNode(audio, modelSettings) {
    return Agent.default.sttNode(this, audio, modelSettings);
  }
  async llmNode(chatCtx, toolCtx, modelSettings) {
    return Agent.default.llmNode(this, chatCtx, toolCtx, modelSettings);
  }
  async ttsNode(text, modelSettings) {
    return Agent.default.ttsNode(this, text, modelSettings);
  }
  async realtimeAudioOutputNode(audio, modelSettings) {
    return Agent.default.realtimeAudioOutputNode(this, audio, modelSettings);
  }
  // realtime_audio_output_node
  getActivityOrThrow() {
    if (!this._agentActivity) {
      throw new Error("Agent activity not found");
    }
    return this._agentActivity;
  }
  async updateChatCtx(chatCtx) {
    if (!this._agentActivity) {
      this._chatCtx = chatCtx.copy({ toolCtx: this.toolCtx });
      return;
    }
    this._agentActivity.updateChatCtx(chatCtx);
  }
  static default = {
    async sttNode(agent, audio, _modelSettings) {
      const activity = agent.getActivityOrThrow();
      if (!activity.stt) {
        throw new Error("sttNode called but no STT node is available");
      }
      let wrapped_stt = activity.stt;
      if (!wrapped_stt.capabilities.streaming) {
        if (!agent.vad) {
          throw new Error(
            "STT does not support streaming, add a VAD to the AgentTask/VoiceAgent to enable streaming"
          );
        }
        wrapped_stt = new import_stt.StreamAdapter(wrapped_stt, agent.vad);
      }
      const stream = wrapped_stt.stream();
      stream.updateInputStream(audio);
      return new import_web.ReadableStream({
        async start(controller) {
          for await (const event of stream) {
            controller.enqueue(event);
          }
          controller.close();
        },
        cancel() {
          stream.detachInputStream();
          stream.close();
        }
      });
    },
    async llmNode(agent, chatCtx, toolCtx, modelSettings) {
      const activity = agent.getActivityOrThrow();
      if (!activity.llm) {
        throw new Error("llmNode called but no LLM node is available");
      }
      if (!(activity.llm instanceof import_llm.LLM)) {
        throw new Error(
          "llmNode should only be used with LLM (non-multimodal/realtime APIs) nodes"
        );
      }
      const { toolChoice } = modelSettings;
      const stream = activity.llm.chat({
        chatCtx,
        toolCtx,
        toolChoice,
        parallelToolCalls: true
      });
      return new import_web.ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
        cancel() {
          stream.close();
        }
      });
    },
    async ttsNode(agent, text, _modelSettings) {
      const activity = agent.getActivityOrThrow();
      if (!activity.tts) {
        throw new Error("ttsNode called but no TTS node is available");
      }
      let wrapped_tts = activity.tts;
      if (!activity.tts.capabilities.streaming) {
        wrapped_tts = new import_tts.StreamAdapter(wrapped_tts, new import_basic.SentenceTokenizer());
      }
      const stream = wrapped_tts.stream();
      stream.updateInputStream(text);
      return new import_web.ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (chunk === import_tts.SynthesizeStream.END_OF_STREAM) {
              break;
            }
            controller.enqueue(chunk.frame);
          }
          controller.close();
        },
        cancel() {
          stream.close();
        }
      });
    },
    async transcriptionNode(agent, text, _modelSettings) {
      return text;
    },
    async realtimeAudioOutputNode(_agent, audio, _modelSettings) {
      return audio;
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Agent,
  STOP_RESPONSE_SYMBOL,
  StopResponse,
  asyncLocalStorage,
  isStopResponse
});
//# sourceMappingURL=agent.cjs.map