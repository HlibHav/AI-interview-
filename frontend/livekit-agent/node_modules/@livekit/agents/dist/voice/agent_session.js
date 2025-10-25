import { EventEmitter } from "node:events";
import {
  LLM as InferenceLLM,
  STT as InferenceSTT,
  TTS as InferenceTTS
} from "../inference/index.js";
import { getJobContext } from "../job.js";
import { ChatContext, ChatMessage } from "../llm/chat_context.js";
import { log } from "../log.js";
import { AgentActivity } from "./agent_activity.js";
import {
  AgentSessionEventTypes,
  CloseReason,
  createAgentStateChangedEvent,
  createCloseEvent,
  createConversationItemAddedEvent,
  createUserStateChangedEvent
} from "./events.js";
import { AgentInput, AgentOutput } from "./io.js";
import { RoomIO } from "./room_io/index.js";
const defaultVoiceOptions = {
  allowInterruptions: true,
  discardAudioIfUninterruptible: true,
  minInterruptionDuration: 500,
  minInterruptionWords: 0,
  minEndpointingDelay: 500,
  maxEndpointingDelay: 6e3,
  maxToolSteps: 3
};
class AgentSession extends EventEmitter {
  vad;
  stt;
  llm;
  tts;
  turnDetection;
  options;
  agent;
  activity;
  nextActivity;
  started = false;
  userState = "listening";
  roomIO;
  logger = log();
  _chatCtx;
  _userData;
  _agentState = "initializing";
  _input;
  _output;
  closingTask = null;
  constructor(opts) {
    super();
    const {
      vad,
      stt,
      llm,
      tts,
      turnDetection,
      userData,
      voiceOptions = defaultVoiceOptions
    } = opts;
    this.vad = vad;
    if (typeof stt === "string") {
      this.stt = InferenceSTT.fromModelString(stt);
    } else {
      this.stt = stt;
    }
    if (typeof llm === "string") {
      this.llm = InferenceLLM.fromModelString(llm);
    } else {
      this.llm = llm;
    }
    if (typeof tts === "string") {
      this.tts = InferenceTTS.fromModelString(tts);
    } else {
      this.tts = tts;
    }
    this.turnDetection = turnDetection;
    this._userData = userData;
    this._input = new AgentInput(this.onAudioInputChanged);
    this._output = new AgentOutput(this.onAudioOutputChanged, this.onTextOutputChanged);
    this._chatCtx = ChatContext.empty();
    this.options = { ...defaultVoiceOptions, ...voiceOptions };
  }
  get input() {
    return this._input;
  }
  get output() {
    return this._output;
  }
  get userData() {
    if (this._userData === void 0) {
      throw new Error("Voice agent userData is not set");
    }
    return this._userData;
  }
  get history() {
    return this._chatCtx;
  }
  set userData(value) {
    this._userData = value;
  }
  async start({
    agent,
    room,
    inputOptions,
    outputOptions
  }) {
    if (this.started) {
      return;
    }
    this.agent = agent;
    this._updateAgentState("initializing");
    const tasks = [];
    if (this.input.audio && (inputOptions == null ? void 0 : inputOptions.audioEnabled) !== false) {
      this.logger.warn("RoomIO audio input is enabled but input.audio is already set, ignoring..");
    }
    if (this.output.audio && (outputOptions == null ? void 0 : outputOptions.audioEnabled) !== false) {
      this.logger.warn(
        "RoomIO audio output is enabled but output.audio is already set, ignoring.."
      );
    }
    if (this.output.transcription && (outputOptions == null ? void 0 : outputOptions.transcriptionEnabled) !== false) {
      this.logger.warn(
        "RoomIO transcription output is enabled but output.transcription is already set, ignoring.."
      );
    }
    this.roomIO = new RoomIO({
      agentSession: this,
      room,
      inputOptions,
      outputOptions
    });
    this.roomIO.start();
    const ctx = getJobContext();
    if (ctx && ctx.room === room && !room.isConnected) {
      this.logger.debug("Auto-connecting to room via job context");
      tasks.push(ctx.connect());
    }
    tasks.push(this.updateActivity(this.agent));
    await Promise.allSettled(tasks);
    this.logger.debug(
      `using audio io: ${this.input.audio ? "`" + this.input.audio.constructor.name + "`" : "(none)"} -> \`AgentSession\` -> ${this.output.audio ? "`" + this.output.audio.constructor.name + "`" : "(none)"}`
    );
    this.logger.debug(
      `using transcript io: \`AgentSession\` -> ${this.output.transcription ? "`" + this.output.transcription.constructor.name + "`" : "(none)"}`
    );
    this.started = true;
    this._updateAgentState("listening");
  }
  updateAgent(agent) {
    this.agent = agent;
    if (this.started) {
      this.updateActivity(agent);
    }
  }
  commitUserTurn() {
    if (!this.activity) {
      throw new Error("AgentSession is not running");
    }
    this.activity.commitUserTurn();
  }
  clearUserTurn() {
    if (!this.activity) {
      throw new Error("AgentSession is not running");
    }
    this.activity.clearUserTurn();
  }
  say(text, options) {
    if (!this.activity) {
      throw new Error("AgentSession is not running");
    }
    return this.activity.say(text, options);
  }
  interrupt() {
    if (!this.activity) {
      throw new Error("AgentSession is not running");
    }
    return this.activity.interrupt();
  }
  generateReply(options) {
    if (!this.activity) {
      throw new Error("AgentSession is not running");
    }
    const userMessage = (options == null ? void 0 : options.userInput) ? new ChatMessage({
      role: "user",
      content: options.userInput
    }) : void 0;
    if (this.activity.draining) {
      if (!this.nextActivity) {
        throw new Error("AgentSession is closing, cannot use generateReply()");
      }
      return this.nextActivity.generateReply({ userMessage, ...options });
    }
    return this.activity.generateReply({ userMessage, ...options });
  }
  async updateActivity(agent) {
    this.nextActivity = new AgentActivity(agent, this);
    if (this.activity) {
      await this.activity.drain();
      await this.activity.close();
    }
    this.activity = this.nextActivity;
    this.nextActivity = void 0;
    await this.activity.start();
    if (this._input.audio) {
      this.activity.attachAudioInput(this._input.audio.stream);
    }
  }
  get chatCtx() {
    return this._chatCtx.copy();
  }
  get agentState() {
    return this._agentState;
  }
  get currentAgent() {
    if (!this.agent) {
      throw new Error("AgentSession is not running");
    }
    return this.agent;
  }
  async close() {
    await this.closeImpl(CloseReason.USER_INITIATED);
  }
  /** @internal */
  _closeSoon({
    reason,
    drain = false,
    error = null
  }) {
    if (this.closingTask) {
      return;
    }
    this.closeImpl(reason, error, drain);
  }
  /** @internal */
  _onError(error) {
    if (this.closingTask || error.recoverable) {
      return;
    }
    this.logger.error(error, "AgentSession is closing due to unrecoverable error");
    this.closingTask = (async () => {
      await this.closeImpl(CloseReason.ERROR, error);
    })().then(() => {
      this.closingTask = null;
    });
  }
  /** @internal */
  _conversationItemAdded(item) {
    this._chatCtx.insert(item);
    this.emit(AgentSessionEventTypes.ConversationItemAdded, createConversationItemAddedEvent(item));
  }
  /** @internal */
  _updateAgentState(state) {
    if (this._agentState === state) {
      return;
    }
    const oldState = this._agentState;
    this._agentState = state;
    this.emit(
      AgentSessionEventTypes.AgentStateChanged,
      createAgentStateChangedEvent(oldState, state)
    );
  }
  /** @internal */
  _updateUserState(state) {
    if (this.userState === state) {
      return;
    }
    const oldState = this.userState;
    this.userState = state;
    this.emit(
      AgentSessionEventTypes.UserStateChanged,
      createUserStateChangedEvent(oldState, state)
    );
  }
  // -- User changed input/output streams/sinks --
  onAudioInputChanged() {
    if (!this.started) {
      return;
    }
    if (this.activity && this._input.audio) {
      this.activity.attachAudioInput(this._input.audio.stream);
    }
  }
  onAudioOutputChanged() {
  }
  onTextOutputChanged() {
  }
  async closeImpl(reason, error = null, drain = false) {
    var _a, _b, _c;
    if (!this.started) {
      return;
    }
    if (this.activity) {
      if (!drain) {
        try {
          this.activity.interrupt();
        } catch (error2) {
        }
      }
      await this.activity.drain();
      await ((_a = this.activity.currentSpeech) == null ? void 0 : _a.waitForPlayout());
      this.activity.detachAudioInput();
    }
    this.input.audio = null;
    this.output.audio = null;
    this.output.transcription = null;
    await ((_b = this.roomIO) == null ? void 0 : _b.close());
    this.roomIO = void 0;
    await ((_c = this.activity) == null ? void 0 : _c.close());
    this.activity = void 0;
    this.started = false;
    this.emit(AgentSessionEventTypes.Close, createCloseEvent(reason, error));
    this.userState = "listening";
    this._agentState = "initializing";
    this.logger.info({ reason, error }, "AgentSession closed");
  }
}
export {
  AgentSession
};
//# sourceMappingURL=agent_session.js.map