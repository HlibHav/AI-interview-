import { AsyncLocalStorage } from "node:async_hooks";
import { ReadableStream } from "node:stream/web";
import {
  LLM as InferenceLLM,
  STT as InferenceSTT,
  TTS as InferenceTTS
} from "../inference/index.js";
import { ReadonlyChatContext } from "../llm/chat_context.js";
import {
  ChatContext,
  LLM
} from "../llm/index.js";
import { StreamAdapter as STTStreamAdapter } from "../stt/index.js";
import { SentenceTokenizer as BasicSentenceTokenizer } from "../tokenize/basic/index.js";
import { SynthesizeStream, StreamAdapter as TTSStreamAdapter } from "../tts/index.js";
const asyncLocalStorage = new AsyncLocalStorage();
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
    }) : ChatContext.empty();
    this.turnDetection = turnDetection;
    this._vad = vad;
    if (typeof stt === "string") {
      this._stt = InferenceSTT.fromModelString(stt);
    } else {
      this._stt = stt;
    }
    if (typeof llm === "string") {
      this._llm = InferenceLLM.fromModelString(llm);
    } else {
      this._llm = llm;
    }
    if (typeof tts === "string") {
      this._tts = InferenceTTS.fromModelString(tts);
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
    return new ReadonlyChatContext(this._chatCtx.items);
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
        wrapped_stt = new STTStreamAdapter(wrapped_stt, agent.vad);
      }
      const stream = wrapped_stt.stream();
      stream.updateInputStream(audio);
      return new ReadableStream({
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
      if (!(activity.llm instanceof LLM)) {
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
      return new ReadableStream({
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
        wrapped_tts = new TTSStreamAdapter(wrapped_tts, new BasicSentenceTokenizer());
      }
      const stream = wrapped_tts.stream();
      stream.updateInputStream(text);
      return new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (chunk === SynthesizeStream.END_OF_STREAM) {
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
export {
  Agent,
  STOP_RESPONSE_SYMBOL,
  StopResponse,
  asyncLocalStorage,
  isStopResponse
};
//# sourceMappingURL=agent.js.map