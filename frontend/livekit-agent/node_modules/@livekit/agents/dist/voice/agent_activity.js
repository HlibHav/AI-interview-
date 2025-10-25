import { Mutex } from "@livekit/mutex";
import { Heap } from "heap-js";
import { AsyncLocalStorage } from "node:async_hooks";
import { ReadableStream } from "node:stream/web";
import { ChatMessage } from "../llm/chat_context.js";
import {
  LLM,
  RealtimeModel
} from "../llm/index.js";
import { log } from "../log.js";
import { DeferredReadableStream } from "../stream/deferred_stream.js";
import { STT } from "../stt/stt.js";
import { splitWords } from "../tokenize/basic/word.js";
import { TTS } from "../tts/tts.js";
import { Future, Task, cancelAndWait, waitFor } from "../utils.js";
import { VAD } from "../vad.js";
import { StopResponse, asyncLocalStorage } from "./agent.js";
import {} from "./agent_session.js";
import {
  AudioRecognition
} from "./audio_recognition.js";
import {
  AgentSessionEventTypes,
  createErrorEvent,
  createFunctionToolsExecutedEvent,
  createMetricsCollectedEvent,
  createSpeechCreatedEvent,
  createUserInputTranscribedEvent
} from "./events.js";
import {
  performAudioForwarding,
  performLLMInference,
  performTTSInference,
  performTextForwarding,
  performToolExecutions,
  removeInstructions,
  updateInstructions
} from "./generation.js";
import { SpeechHandle } from "./speech_handle.js";
const speechHandleStorage = new AsyncLocalStorage();
class AgentActivity {
  static REPLY_TASK_CANCEL_TIMEOUT = 5e3;
  started = false;
  audioRecognition;
  realtimeSession;
  turnDetectionMode;
  logger = log();
  _draining = false;
  _currentSpeech;
  speechQueue;
  // [priority, timestamp, speechHandle]
  q_updated;
  speechTasks = /* @__PURE__ */ new Set();
  lock = new Mutex();
  audioStream = new DeferredReadableStream();
  // default to null as None, which maps to the default provider tool choice value
  toolChoice = null;
  agent;
  agentSession;
  /** @internal */
  _mainTask;
  _userTurnCompletedTask;
  constructor(agent, agentSession) {
    this.agent = agent;
    this.agentSession = agentSession;
    this.speechQueue = new Heap(([p1, t1, _], [p2, t2, __]) => {
      return p1 === p2 ? t1 - t2 : p2 - p1;
    });
    this.q_updated = new Future();
    this.turnDetectionMode = typeof this.turnDetection === "string" ? this.turnDetection : void 0;
    if (this.turnDetectionMode === "vad" && this.vad === void 0) {
      this.logger.warn(
        'turnDetection is set to "vad", but no VAD model is provided, ignoring the turnDdetection setting'
      );
      this.turnDetectionMode = void 0;
    }
    if (this.turnDetectionMode === "stt" && this.stt === void 0) {
      this.logger.warn(
        'turnDetection is set to "stt", but no STT model is provided, ignoring the turnDetection setting'
      );
      this.turnDetectionMode = void 0;
    }
    if (this.llm instanceof RealtimeModel) {
      if (this.llm.capabilities.turnDetection && !this.allowInterruptions) {
        this.logger.warn(
          "the RealtimeModel uses a server-side turn detection, allowInterruptions cannot be false, disable turnDetection in the RealtimeModel and use VAD on the AgentSession instead"
        );
      }
      if (this.turnDetectionMode === "realtime_llm" && !this.llm.capabilities.turnDetection) {
        this.logger.warn(
          'turnDetection is set to "realtime_llm", but the LLM is not a RealtimeModel or the server-side turn detection is not supported/enabled, ignoring the turnDetection setting'
        );
        this.turnDetectionMode = void 0;
      }
      if (this.turnDetectionMode === "stt") {
        this.logger.warn(
          'turnDetection is set to "stt", but the LLM is a RealtimeModel, ignoring the turnDetection setting'
        );
        this.turnDetectionMode = void 0;
      }
      if (this.turnDetectionMode && this.turnDetectionMode !== "realtime_llm" && this.llm.capabilities.turnDetection) {
        this.logger.warn(
          `turnDetection is set to "${this.turnDetectionMode}", but the LLM is a RealtimeModel and server-side turn detection enabled, ignoring the turnDetection setting`
        );
        this.turnDetectionMode = void 0;
      }
      if (!this.llm.capabilities.turnDetection && this.vad && this.turnDetectionMode === void 0) {
        this.turnDetectionMode = "vad";
      }
    } else if (this.turnDetectionMode === "realtime_llm") {
      this.logger.warn(
        'turnDetection is set to "realtime_llm", but the LLM is not a RealtimeModel'
      );
      this.turnDetectionMode = void 0;
    }
    if (!this.vad && this.stt && this.llm instanceof LLM && this.allowInterruptions && this.turnDetectionMode === void 0) {
      this.logger.warn(
        "VAD is not set. Enabling VAD is recommended when using LLM and STT for more responsive interruption handling."
      );
    }
  }
  async start() {
    const unlock = await this.lock.lock();
    try {
      this.agent._agentActivity = this;
      if (this.llm instanceof RealtimeModel) {
        this.realtimeSession = this.llm.session();
        this.realtimeSession.on("generation_created", (ev) => this.onGenerationCreated(ev));
        this.realtimeSession.on("input_speech_started", (ev) => this.onInputSpeechStarted(ev));
        this.realtimeSession.on("input_speech_stopped", (ev) => this.onInputSpeechStopped(ev));
        this.realtimeSession.on(
          "input_audio_transcription_completed",
          (ev) => this.onInputAudioTranscriptionCompleted(ev)
        );
        this.realtimeSession.on("metrics_collected", (ev) => this.onMetricsCollected(ev));
        this.realtimeSession.on("error", (ev) => this.onError(ev));
        removeInstructions(this.agent._chatCtx);
        try {
          await this.realtimeSession.updateInstructions(this.agent.instructions);
        } catch (error) {
          this.logger.error(error, "failed to update the instructions");
        }
        try {
          await this.realtimeSession.updateChatCtx(this.agent.chatCtx);
        } catch (error) {
          this.logger.error(error, "failed to update the chat context");
        }
        try {
          await this.realtimeSession.updateTools(this.tools);
        } catch (error) {
          this.logger.error(error, "failed to update the tools");
        }
      } else if (this.llm instanceof LLM) {
        try {
          updateInstructions({
            chatCtx: this.agent._chatCtx,
            instructions: this.agent.instructions,
            addIfMissing: true
          });
        } catch (error) {
          this.logger.error("failed to update the instructions", error);
        }
      }
      if (this.llm instanceof LLM) {
        this.llm.on("metrics_collected", (ev) => this.onMetricsCollected(ev));
        this.llm.on("error", (ev) => this.onError(ev));
      }
      if (this.stt instanceof STT) {
        this.stt.on("metrics_collected", (ev) => this.onMetricsCollected(ev));
        this.stt.on("error", (ev) => this.onError(ev));
      }
      if (this.tts instanceof TTS) {
        this.tts.on("metrics_collected", (ev) => this.onMetricsCollected(ev));
        this.tts.on("error", (ev) => this.onError(ev));
      }
      if (this.vad instanceof VAD) {
        this.vad.on("metrics_collected", (ev) => this.onMetricsCollected(ev));
      }
      this.audioRecognition = new AudioRecognition({
        recognitionHooks: this,
        // Disable stt node if stt is not provided
        stt: this.stt ? (...args) => this.agent.sttNode(...args) : void 0,
        vad: this.vad,
        turnDetector: typeof this.turnDetection === "string" ? void 0 : this.turnDetection,
        turnDetectionMode: this.turnDetectionMode,
        minEndpointingDelay: this.agentSession.options.minEndpointingDelay,
        maxEndpointingDelay: this.agentSession.options.maxEndpointingDelay
      });
      this.audioRecognition.start();
      this.started = true;
      this._mainTask = Task.from(({ signal }) => this.mainTask(signal));
      this.createSpeechTask({
        task: Task.from(() => this.agent.onEnter()),
        name: "AgentActivity_onEnter"
      });
    } finally {
      unlock();
    }
  }
  get currentSpeech() {
    return this._currentSpeech;
  }
  get vad() {
    return this.agent.vad || this.agentSession.vad;
  }
  get stt() {
    return this.agent.stt || this.agentSession.stt;
  }
  get llm() {
    return this.agent.llm || this.agentSession.llm;
  }
  get tts() {
    return this.agent.tts || this.agentSession.tts;
  }
  get tools() {
    return this.agent.toolCtx;
  }
  get draining() {
    return this._draining;
  }
  get realtimeLLMSession() {
    return this.realtimeSession;
  }
  get allowInterruptions() {
    return this.agentSession.options.allowInterruptions;
  }
  get turnDetection() {
    return this.agentSession.turnDetection;
  }
  get toolCtx() {
    return this.agent.toolCtx;
  }
  async updateChatCtx(chatCtx) {
    chatCtx = chatCtx.copy({ toolCtx: this.toolCtx });
    this.agent._chatCtx = chatCtx;
    if (this.realtimeSession) {
      removeInstructions(chatCtx);
      this.realtimeSession.updateChatCtx(chatCtx);
    } else {
      updateInstructions({
        chatCtx,
        instructions: this.agent.instructions,
        addIfMissing: true
      });
    }
  }
  updateOptions({ toolChoice }) {
    if (toolChoice !== void 0) {
      this.toolChoice = toolChoice;
    }
    if (this.realtimeSession) {
      this.realtimeSession.updateOptions({ toolChoice: this.toolChoice });
    }
  }
  attachAudioInput(audioStream) {
    if (this.audioStream.isSourceSet) {
      this.logger.debug("detaching existing audio input in agent activity");
      this.audioStream.detachSource();
    }
    this.audioStream.setSource(audioStream);
    const [realtimeAudioStream, recognitionAudioStream] = this.audioStream.stream.tee();
    if (this.realtimeSession) {
      this.realtimeSession.setInputAudioStream(realtimeAudioStream);
    }
    if (this.audioRecognition) {
      this.audioRecognition.setInputAudioStream(recognitionAudioStream);
    }
  }
  detachAudioInput() {
    this.audioStream.detachSource();
  }
  commitUserTurn() {
    if (!this.audioRecognition) {
      throw new Error("AudioRecognition is not initialized");
    }
    const audioDetached = false;
    this.audioRecognition.commitUserTurn(audioDetached);
  }
  clearUserTurn() {
    var _a, _b;
    (_a = this.audioRecognition) == null ? void 0 : _a.clearUserTurn();
    (_b = this.realtimeSession) == null ? void 0 : _b.clearAudio();
  }
  say(text, options) {
    const {
      audio,
      allowInterruptions: defaultAllowInterruptions,
      addToChatCtx = true
    } = options ?? {};
    let allowInterruptions = defaultAllowInterruptions;
    if (!audio && !this.tts && this.agentSession.output.audio && this.agentSession.output.audioEnabled) {
      throw new Error("trying to generate speech from text without a TTS model");
    }
    if (this.llm instanceof RealtimeModel && this.llm.capabilities.turnDetection && allowInterruptions === false) {
      this.logger.warn(
        "the RealtimeModel uses a server-side turn detection, allowInterruptions cannot be false when using VoiceAgent.say(), disable turnDetection in the RealtimeModel and use VAD on the AgentTask/VoiceAgent instead"
      );
      allowInterruptions = true;
    }
    const handle = SpeechHandle.create({
      allowInterruptions: allowInterruptions ?? this.allowInterruptions
    });
    this.agentSession.emit(
      AgentSessionEventTypes.SpeechCreated,
      createSpeechCreatedEvent({
        userInitiated: true,
        source: "say",
        speechHandle: handle
      })
    );
    const task = this.createSpeechTask({
      task: Task.from(
        (abortController) => this.ttsTask(handle, text, addToChatCtx, {}, abortController, audio)
      ),
      ownedSpeechHandle: handle,
      name: "AgentActivity.say_tts"
    });
    task.finally(() => this.onPipelineReplyDone());
    this.scheduleSpeech(handle, SpeechHandle.SPEECH_PRIORITY_NORMAL);
    return handle;
  }
  // -- Metrics and errors --
  onMetricsCollected = (ev) => {
    const speechHandle = speechHandleStorage.getStore();
    if (speechHandle && (ev.type === "llm_metrics" || ev.type === "tts_metrics")) {
      ev.speechId = speechHandle.id;
    }
    this.agentSession.emit(
      AgentSessionEventTypes.MetricsCollected,
      createMetricsCollectedEvent({ metrics: ev })
    );
  };
  onError(ev) {
    if (ev.type === "realtime_model_error") {
      const errorEvent = createErrorEvent(ev.error, this.llm);
      this.agentSession.emit(AgentSessionEventTypes.Error, errorEvent);
    } else if (ev.type === "stt_error") {
      const errorEvent = createErrorEvent(ev.error, this.stt);
      this.agentSession.emit(AgentSessionEventTypes.Error, errorEvent);
    } else if (ev.type === "tts_error") {
      const errorEvent = createErrorEvent(ev.error, this.tts);
      this.agentSession.emit(AgentSessionEventTypes.Error, errorEvent);
    } else if (ev.type === "llm_error") {
      const errorEvent = createErrorEvent(ev.error, this.llm);
      this.agentSession.emit(AgentSessionEventTypes.Error, errorEvent);
    }
    this.agentSession._onError(ev);
  }
  // -- Realtime Session events --
  onInputSpeechStarted(_ev) {
    this.logger.info("onInputSpeechStarted");
    if (!this.vad) {
      this.agentSession._updateUserState("speaking");
    }
    try {
      this.interrupt();
    } catch (error) {
      this.logger.error(
        "RealtimeAPI input_speech_started, but current speech is not interruptable, this should never happen!",
        error
      );
    }
  }
  onInputSpeechStopped(ev) {
    this.logger.info(ev, "onInputSpeechStopped");
    if (!this.vad) {
      this.agentSession._updateUserState("listening");
    }
    if (ev.userTranscriptionEnabled) {
      this.agentSession.emit(
        AgentSessionEventTypes.UserInputTranscribed,
        createUserInputTranscribedEvent({
          isFinal: false,
          transcript: ""
        })
      );
    }
  }
  onInputAudioTranscriptionCompleted(ev) {
    this.agentSession.emit(
      AgentSessionEventTypes.UserInputTranscribed,
      createUserInputTranscribedEvent({
        transcript: ev.transcript,
        isFinal: ev.isFinal
      })
    );
    if (ev.isFinal) {
      const message = ChatMessage.create({
        role: "user",
        content: ev.transcript,
        id: ev.itemId
      });
      this.agent._chatCtx.items.push(message);
      this.agentSession._conversationItemAdded(message);
    }
  }
  onGenerationCreated(ev) {
    if (ev.userInitiated) {
      return;
    }
    if (this.draining) {
      this.logger.warn("skipping new realtime generation, the agent is draining");
      return;
    }
    const handle = SpeechHandle.create({
      allowInterruptions: this.allowInterruptions
    });
    this.agentSession.emit(
      AgentSessionEventTypes.SpeechCreated,
      createSpeechCreatedEvent({
        userInitiated: false,
        source: "generate_reply",
        speechHandle: handle
      })
    );
    this.logger.info({ speech_id: handle.id }, "Creating speech handle");
    this.createSpeechTask({
      task: Task.from(
        (abortController) => this.realtimeGenerationTask(handle, ev, {}, abortController)
      ),
      ownedSpeechHandle: handle,
      name: "AgentActivity.realtimeGeneration"
    });
    this.scheduleSpeech(handle, SpeechHandle.SPEECH_PRIORITY_NORMAL);
  }
  // recognition hooks
  onStartOfSpeech(_ev) {
    this.agentSession._updateUserState("speaking");
  }
  onEndOfSpeech(_ev) {
    this.agentSession._updateUserState("listening");
  }
  onVADInferenceDone(ev) {
    var _a, _b;
    if (this.turnDetection === "manual" || this.turnDetection === "realtime_llm") {
      return;
    }
    if (this.llm instanceof RealtimeModel && this.llm.capabilities.turnDetection) {
      return;
    }
    if (ev.speechDuration < this.agentSession.options.minInterruptionDuration) {
      return;
    }
    if (this.stt && this.agentSession.options.minInterruptionWords > 0 && this.audioRecognition) {
      const text = this.audioRecognition.currentTranscript;
      if (text && splitWords(text, true).length < this.agentSession.options.minInterruptionWords) {
        return;
      }
    }
    (_a = this.realtimeSession) == null ? void 0 : _a.startUserActivity();
    if (this._currentSpeech && !this._currentSpeech.interrupted && this._currentSpeech.allowInterruptions) {
      this.logger.info({ "speech id": this._currentSpeech.id }, "speech interrupted by VAD");
      (_b = this.realtimeSession) == null ? void 0 : _b.interrupt();
      this._currentSpeech.interrupt();
    }
  }
  onInterimTranscript(ev) {
    if (this.llm instanceof RealtimeModel && this.llm.capabilities.userTranscription) {
      return;
    }
    this.agentSession.emit(
      AgentSessionEventTypes.UserInputTranscribed,
      createUserInputTranscribedEvent({
        transcript: ev.alternatives[0].text,
        isFinal: false,
        language: ev.alternatives[0].language
        // TODO(AJS-106): add multi participant support
      })
    );
  }
  onFinalTranscript(ev) {
    if (this.llm instanceof RealtimeModel && this.llm.capabilities.userTranscription) {
      return;
    }
    this.agentSession.emit(
      AgentSessionEventTypes.UserInputTranscribed,
      createUserInputTranscribedEvent({
        transcript: ev.alternatives[0].text,
        isFinal: true,
        language: ev.alternatives[0].language
        // TODO(AJS-106): add multi participant support
      })
    );
  }
  createSpeechTask(options) {
    const { task, ownedSpeechHandle } = options;
    this.speechTasks.add(task);
    task.addDoneCallback(() => {
      this.speechTasks.delete(task);
    });
    if (ownedSpeechHandle) {
      ownedSpeechHandle._tasks.push(task);
      task.addDoneCallback(() => {
        if (ownedSpeechHandle._tasks.every((t) => t.done)) {
          ownedSpeechHandle._markDone();
        }
      });
    }
    task.addDoneCallback(() => {
      this.wakeupMainTask();
    });
    return task.result;
  }
  async onEndOfTurn(info) {
    if (this.draining) {
      this.logger.warn({ user_input: info.newTranscript }, "skipping user input, task is draining");
      return true;
    }
    if (this.stt && this.turnDetection !== "manual" && this._currentSpeech && this._currentSpeech.allowInterruptions && !this._currentSpeech.interrupted && this.agentSession.options.minInterruptionWords > 0 && info.newTranscript.split(" ").length < this.agentSession.options.minInterruptionWords) {
      this.logger.info("skipping user input, new_transcript is too short");
      return false;
    }
    const oldTask = this._userTurnCompletedTask;
    this._userTurnCompletedTask = this.createSpeechTask({
      task: Task.from(() => this.userTurnCompleted(info, oldTask)),
      name: "AgentActivity.userTurnCompleted"
    });
    return true;
  }
  retrieveChatCtx() {
    return this.agentSession.chatCtx;
  }
  async mainTask(signal) {
    const abortFuture = new Future();
    const abortHandler = () => {
      abortFuture.resolve();
      signal.removeEventListener("abort", abortHandler);
    };
    signal.addEventListener("abort", abortHandler);
    while (true) {
      await Promise.race([this.q_updated.await, abortFuture.await]);
      if (signal.aborted) break;
      while (this.speechQueue.size() > 0) {
        if (signal.aborted) break;
        const heapItem = this.speechQueue.pop();
        if (!heapItem) {
          throw new Error("Speech queue is empty");
        }
        const speechHandle = heapItem[2];
        this._currentSpeech = speechHandle;
        speechHandle._authorizeGeneration();
        await speechHandle._waitForGeneration();
        this._currentSpeech = void 0;
      }
      if (this.draining && this.speechTasks.size === 0) {
        this.logger.info("mainTask: draining and no more speech tasks");
        break;
      }
      this.q_updated = new Future();
    }
    this.logger.info("AgentActivity mainTask: exiting");
  }
  wakeupMainTask() {
    this.q_updated.resolve();
  }
  generateReply(options) {
    var _a;
    const {
      userMessage,
      chatCtx,
      instructions: defaultInstructions,
      toolChoice: defaultToolChoice,
      allowInterruptions: defaultAllowInterruptions
    } = options;
    let instructions = defaultInstructions;
    let toolChoice = defaultToolChoice;
    let allowInterruptions = defaultAllowInterruptions;
    if (this.llm instanceof RealtimeModel && this.llm.capabilities.turnDetection && allowInterruptions === false) {
      this.logger.warn(
        "the RealtimeModel uses a server-side turn detection, allowInterruptions cannot be false when using VoiceAgent.generateReply(), disable turnDetection in the RealtimeModel and use VAD on the AgentTask/VoiceAgent instead"
      );
      allowInterruptions = true;
    }
    if (this.llm === void 0) {
      throw new Error("trying to generate reply without an LLM model");
    }
    const functionCall = (_a = asyncLocalStorage.getStore()) == null ? void 0 : _a.functionCall;
    if (toolChoice === void 0 && functionCall !== void 0) {
      toolChoice = "none";
    }
    const handle = SpeechHandle.create({
      allowInterruptions: allowInterruptions ?? this.allowInterruptions
    });
    this.agentSession.emit(
      AgentSessionEventTypes.SpeechCreated,
      createSpeechCreatedEvent({
        userInitiated: true,
        source: "generate_reply",
        speechHandle: handle
      })
    );
    this.logger.info({ speech_id: handle.id }, "Creating speech handle");
    if (this.llm instanceof RealtimeModel) {
      this.createSpeechTask({
        task: Task.from(
          (abortController) => this.realtimeReplyTask({
            speechHandle: handle,
            // TODO(brian): support llm.ChatMessage for the realtime model
            userInput: userMessage == null ? void 0 : userMessage.textContent,
            instructions,
            modelSettings: {
              // isGiven(toolChoice) = toolChoice !== undefined
              toolChoice: toOaiToolChoice(toolChoice !== void 0 ? toolChoice : this.toolChoice)
            },
            abortController
          })
        ),
        ownedSpeechHandle: handle,
        name: "AgentActivity.realtimeReply"
      });
    } else if (this.llm instanceof LLM) {
      if (instructions) {
        instructions = `${this.agent.instructions}
${instructions}`;
      }
      const task = this.createSpeechTask({
        task: Task.from(
          (abortController) => this.pipelineReplyTask(
            handle,
            chatCtx ?? this.agent.chatCtx,
            this.agent.toolCtx,
            {
              toolChoice: toOaiToolChoice(toolChoice !== void 0 ? toolChoice : this.toolChoice)
            },
            abortController,
            instructions ? `${this.agent.instructions}
${instructions}` : instructions,
            userMessage
          )
        ),
        ownedSpeechHandle: handle,
        name: "AgentActivity.pipelineReply"
      });
      task.finally(() => this.onPipelineReplyDone());
    }
    this.scheduleSpeech(handle, SpeechHandle.SPEECH_PRIORITY_NORMAL);
    return handle;
  }
  interrupt() {
    var _a;
    const future = new Future();
    const currentSpeech = this._currentSpeech;
    currentSpeech == null ? void 0 : currentSpeech.interrupt();
    for (const [_, __, speech] of this.speechQueue) {
      speech.interrupt();
    }
    (_a = this.realtimeSession) == null ? void 0 : _a.interrupt();
    if (currentSpeech === void 0) {
      future.resolve();
    } else {
      currentSpeech.addDoneCallback(() => {
        if (future.done) return;
        future.resolve();
      });
    }
    return future;
  }
  onPipelineReplyDone() {
    if (!this.speechQueue.peek() && (!this._currentSpeech || this._currentSpeech.done())) {
      this.agentSession._updateAgentState("listening");
    }
  }
  async userTurnCompleted(info, oldTask) {
    var _a, _b;
    if (oldTask) {
      await oldTask;
    }
    if (this.llm instanceof RealtimeModel) {
      if (this.llm.capabilities.turnDetection) {
        return;
      }
      (_a = this.realtimeSession) == null ? void 0 : _a.commitAudio();
    }
    if (this._currentSpeech) {
      if (!this._currentSpeech.allowInterruptions) {
        this.logger.warn(
          { user_input: info.newTranscript },
          "skipping user input, current speech generation cannot be interrupted"
        );
        return;
      }
      this.logger.info(
        { "speech id": this._currentSpeech.id },
        "speech interrupted, new user turn detected"
      );
      this._currentSpeech.interrupt();
      (_b = this.realtimeSession) == null ? void 0 : _b.interrupt();
    }
    let userMessage = ChatMessage.create({
      role: "user",
      content: info.newTranscript
    });
    const chatCtx = this.agent.chatCtx.copy();
    const startTime = Date.now();
    try {
      await this.agent.onUserTurnCompleted(chatCtx, userMessage);
    } catch (e) {
      if (e instanceof StopResponse) {
        return;
      }
      this.logger.error({ error: e }, "error occurred during onUserTurnCompleted");
    }
    const callbackDuration = Date.now() - startTime;
    if (this.llm instanceof RealtimeModel) {
      userMessage = void 0;
    } else if (this.llm === void 0) {
      return;
    }
    const speechHandle = this.generateReply({ userMessage, chatCtx });
    const eouMetrics = {
      type: "eou_metrics",
      timestamp: Date.now(),
      endOfUtteranceDelayMs: info.endOfUtteranceDelay,
      transcriptionDelayMs: info.transcriptionDelay,
      onUserTurnCompletedDelayMs: callbackDuration,
      speechId: speechHandle.id
    };
    this.agentSession.emit(
      AgentSessionEventTypes.MetricsCollected,
      createMetricsCollectedEvent({ metrics: eouMetrics })
    );
  }
  async ttsTask(speechHandle, text, addToChatCtx, modelSettings, replyAbortController, audio) {
    speechHandleStorage.enterWith(speechHandle);
    const transcriptionOutput = this.agentSession.output.transcriptionEnabled ? this.agentSession.output.transcription : null;
    const audioOutput = this.agentSession.output.audioEnabled ? this.agentSession.output.audio : null;
    await speechHandle.waitIfNotInterrupted([speechHandle._waitForAuthorization()]);
    if (speechHandle.interrupted) {
      return;
    }
    let baseStream;
    if (text instanceof ReadableStream) {
      baseStream = text;
    } else {
      baseStream = new ReadableStream({
        start(controller) {
          controller.enqueue(text);
          controller.close();
        }
      });
    }
    const [textSource, audioSource] = baseStream.tee();
    const tasks = [];
    const trNode = await this.agent.transcriptionNode(textSource, {});
    let textOut = null;
    if (trNode) {
      const [textForwardTask, _textOut] = performTextForwarding(
        trNode,
        replyAbortController,
        transcriptionOutput
      );
      textOut = _textOut;
      tasks.push(textForwardTask);
    }
    const onFirstFrame = () => {
      this.agentSession._updateAgentState("speaking");
    };
    if (!audioOutput) {
      if (textOut) {
        textOut.firstTextFut.await.finally(onFirstFrame);
      }
    } else {
      let audioOut = null;
      if (!audio) {
        const [ttsTask, ttsStream] = performTTSInference(
          (...args) => this.agent.ttsNode(...args),
          audioSource,
          modelSettings,
          replyAbortController
        );
        tasks.push(ttsTask);
        const [forwardTask, _audioOut] = performAudioForwarding(
          ttsStream,
          audioOutput,
          replyAbortController
        );
        tasks.push(forwardTask);
        audioOut = _audioOut;
      } else {
        const [forwardTask, _audioOut] = performAudioForwarding(
          audio,
          audioOutput,
          replyAbortController
        );
        tasks.push(forwardTask);
        audioOut = _audioOut;
      }
      audioOut.firstFrameFut.await.finally(onFirstFrame);
    }
    await speechHandle.waitIfNotInterrupted(tasks.map((task) => task.result));
    if (audioOutput) {
      await speechHandle.waitIfNotInterrupted([audioOutput.waitForPlayout()]);
    }
    if (speechHandle.interrupted) {
      replyAbortController.abort();
      await cancelAndWait(tasks, AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      if (audioOutput) {
        audioOutput.clearBuffer();
        await audioOutput.waitForPlayout();
      }
    }
    if (addToChatCtx) {
      const message = ChatMessage.create({
        role: "assistant",
        content: (textOut == null ? void 0 : textOut.text) || "",
        interrupted: speechHandle.interrupted
      });
      this.agent._chatCtx.insert(message);
      this.agentSession._conversationItemAdded(message);
    }
    if (this.agentSession.agentState === "speaking") {
      this.agentSession._updateAgentState("listening");
    }
  }
  async pipelineReplyTask(speechHandle, chatCtx, toolCtx, modelSettings, replyAbortController, instructions, newMessage, toolsMessages) {
    var _a, _b, _c;
    speechHandleStorage.enterWith(speechHandle);
    const audioOutput = this.agentSession.output.audioEnabled ? this.agentSession.output.audio : null;
    const transcriptionOutput = this.agentSession.output.transcriptionEnabled ? this.agentSession.output.transcription : null;
    chatCtx = chatCtx.copy();
    if (newMessage) {
      chatCtx.insert(newMessage);
      this.agent._chatCtx.insert(newMessage);
      this.agentSession._conversationItemAdded(newMessage);
    }
    if (instructions) {
      try {
        updateInstructions({
          chatCtx,
          instructions,
          addIfMissing: true
        });
      } catch (e) {
        this.logger.error({ error: e }, "error occurred during updateInstructions");
      }
    }
    this.agentSession._updateAgentState("thinking");
    const tasks = [];
    const [llmTask, llmGenData] = performLLMInference(
      // preserve  `this` context in llmNode
      (...args) => this.agent.llmNode(...args),
      chatCtx,
      toolCtx,
      modelSettings,
      replyAbortController
    );
    tasks.push(llmTask);
    const [ttsTextInput, llmOutput] = llmGenData.textStream.tee();
    let ttsTask = null;
    let ttsStream = null;
    if (audioOutput) {
      [ttsTask, ttsStream] = performTTSInference(
        (...args) => this.agent.ttsNode(...args),
        ttsTextInput,
        modelSettings,
        replyAbortController
      );
      tasks.push(ttsTask);
    }
    await speechHandle.waitIfNotInterrupted([speechHandle._waitForScheduled()]);
    if (speechHandle.interrupted) {
      replyAbortController.abort();
      await cancelAndWait(tasks, AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      return;
    }
    this.agentSession._updateAgentState("thinking");
    await speechHandle.waitIfNotInterrupted([speechHandle._waitForAuthorization()]);
    speechHandle._clearAuthorization();
    const replyStartedAt = Date.now();
    const trNodeResult = await this.agent.transcriptionNode(llmOutput, modelSettings);
    let textOut = null;
    if (trNodeResult) {
      const [textForwardTask, _textOut] = performTextForwarding(
        trNodeResult,
        replyAbortController,
        transcriptionOutput
      );
      tasks.push(textForwardTask);
      textOut = _textOut;
    }
    const onFirstFrame = () => {
      this.agentSession._updateAgentState("speaking");
    };
    let audioOut = null;
    if (audioOutput) {
      if (ttsStream) {
        const [forwardTask, _audioOut] = performAudioForwarding(
          ttsStream,
          audioOutput,
          replyAbortController
        );
        audioOut = _audioOut;
        tasks.push(forwardTask);
        audioOut.firstFrameFut.await.finally(onFirstFrame);
      } else {
        throw Error("ttsStream is null when audioOutput is enabled");
      }
    } else {
      textOut == null ? void 0 : textOut.firstTextFut.await.finally(onFirstFrame);
    }
    const onToolExecutionStarted = (_) => {
    };
    const onToolExecutionCompleted = (_) => {
    };
    const [executeToolsTask, toolOutput] = performToolExecutions({
      session: this.agentSession,
      speechHandle,
      toolCtx,
      toolChoice: modelSettings.toolChoice,
      toolCallStream: llmGenData.toolCallStream,
      controller: replyAbortController,
      onToolExecutionStarted,
      onToolExecutionCompleted
    });
    await speechHandle.waitIfNotInterrupted(tasks.map((task) => task.result));
    if (audioOutput) {
      await speechHandle.waitIfNotInterrupted([audioOutput.waitForPlayout()]);
    }
    if (toolsMessages) {
      for (const msg of toolsMessages) {
        msg.createdAt = replyStartedAt;
      }
      this.agent._chatCtx.insert(toolsMessages);
    }
    if (speechHandle.interrupted) {
      this.logger.debug(
        { speech_id: speechHandle.id },
        "Aborting all pipeline reply tasks due to interruption"
      );
      replyAbortController.abort();
      await Promise.allSettled(
        tasks.map((task) => task.cancelAndWait(AgentActivity.REPLY_TASK_CANCEL_TIMEOUT))
      );
      let forwardedText = (textOut == null ? void 0 : textOut.text) || "";
      if (audioOutput) {
        audioOutput.clearBuffer();
        const playbackEv = await audioOutput.waitForPlayout();
        if (audioOut == null ? void 0 : audioOut.firstFrameFut.done) {
          this.logger.info(
            { speech_id: speechHandle.id, playbackPosition: playbackEv.playbackPosition },
            "playout interrupted"
          );
          if (playbackEv.synchronizedTranscript) {
            forwardedText = playbackEv.synchronizedTranscript;
          }
        } else {
          forwardedText = "";
        }
      }
      if (forwardedText) {
        const message = ChatMessage.create({
          role: "assistant",
          content: forwardedText,
          id: llmGenData.id,
          interrupted: true,
          createdAt: replyStartedAt
        });
        chatCtx.insert(message);
        this.agent._chatCtx.insert(message);
        this.agentSession._conversationItemAdded(message);
      }
      if (this.agentSession.agentState === "speaking") {
        this.agentSession._updateAgentState("listening");
      }
      this.logger.info(
        { speech_id: speechHandle.id, message: forwardedText },
        "playout completed with interrupt"
      );
      speechHandle._markGenerationDone();
      await executeToolsTask.cancelAndWait(AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      return;
    }
    if (textOut && textOut.text) {
      const message = ChatMessage.create({
        role: "assistant",
        id: llmGenData.id,
        interrupted: false,
        createdAt: replyStartedAt,
        content: textOut.text
      });
      chatCtx.insert(message);
      this.agent._chatCtx.insert(message);
      this.agentSession._conversationItemAdded(message);
      this.logger.info(
        { speech_id: speechHandle.id, message: textOut.text },
        "playout completed without interruption"
      );
    }
    if (toolOutput.output.length > 0) {
      this.agentSession._updateAgentState("thinking");
    } else if (this.agentSession.agentState === "speaking") {
      this.agentSession._updateAgentState("listening");
    }
    speechHandle._markGenerationDone();
    await executeToolsTask.result;
    if (toolOutput.output.length === 0) return;
    const { maxToolSteps } = this.agentSession.options;
    if (speechHandle.numSteps >= maxToolSteps) {
      this.logger.warn(
        { speech_id: speechHandle.id, max_tool_steps: maxToolSteps },
        "maximum number of function calls steps reached"
      );
      return;
    }
    const functionToolsExecutedEvent = createFunctionToolsExecutedEvent({
      functionCalls: [],
      functionCallOutputs: []
    });
    let shouldGenerateToolReply = false;
    let newAgentTask = null;
    let ignoreTaskSwitch = false;
    for (const sanitizedOut of toolOutput.output) {
      if (sanitizedOut.toolCallOutput !== void 0) {
        functionToolsExecutedEvent.functionCalls.push(sanitizedOut.toolCall);
        functionToolsExecutedEvent.functionCallOutputs.push(sanitizedOut.toolCallOutput);
        if (sanitizedOut.replyRequired) {
          shouldGenerateToolReply = true;
        }
      }
      if (newAgentTask !== null && sanitizedOut.agentTask !== void 0) {
        this.logger.error("expected to receive only one agent task from the tool executions");
        ignoreTaskSwitch = true;
      }
      newAgentTask = sanitizedOut.agentTask ?? null;
      this.logger.debug(
        {
          speechId: speechHandle.id,
          name: (_a = sanitizedOut.toolCall) == null ? void 0 : _a.name,
          args: sanitizedOut.toolCall.args,
          output: (_b = sanitizedOut.toolCallOutput) == null ? void 0 : _b.output,
          isError: (_c = sanitizedOut.toolCallOutput) == null ? void 0 : _c.isError
        },
        "Tool call execution finished"
      );
    }
    this.agentSession.emit(
      AgentSessionEventTypes.FunctionToolsExecuted,
      functionToolsExecutedEvent
    );
    let draining = this.draining;
    if (!ignoreTaskSwitch && newAgentTask !== null) {
      this.agentSession.updateAgent(newAgentTask);
      draining = true;
    }
    const toolMessages = [
      ...functionToolsExecutedEvent.functionCalls,
      ...functionToolsExecutedEvent.functionCallOutputs
    ];
    if (shouldGenerateToolReply) {
      chatCtx.insert(toolMessages);
      const handle = SpeechHandle.create({
        allowInterruptions: speechHandle.allowInterruptions,
        stepIndex: speechHandle._stepIndex + 1,
        parent: speechHandle
      });
      this.agentSession.emit(
        AgentSessionEventTypes.SpeechCreated,
        createSpeechCreatedEvent({
          userInitiated: false,
          source: "tool_response",
          speechHandle: handle
        })
      );
      const respondToolChoice = draining || modelSettings.toolChoice === "none" ? "none" : "auto";
      const toolResponseTask = this.createSpeechTask({
        task: Task.from(
          () => this.pipelineReplyTask(
            handle,
            chatCtx,
            toolCtx,
            { toolChoice: respondToolChoice },
            replyAbortController,
            instructions,
            void 0,
            toolMessages
          )
        ),
        ownedSpeechHandle: handle,
        name: "AgentActivity.pipelineReply"
      });
      toolResponseTask.finally(() => this.onPipelineReplyDone());
      this.scheduleSpeech(handle, SpeechHandle.SPEECH_PRIORITY_NORMAL, true);
    } else if (functionToolsExecutedEvent.functionCallOutputs.length > 0) {
      for (const msg of toolMessages) {
        msg.createdAt = replyStartedAt;
      }
      this.agent._chatCtx.insert(toolMessages);
    }
  }
  async realtimeGenerationTask(speechHandle, ev, modelSettings, replyAbortController) {
    var _a, _b, _c;
    speechHandleStorage.enterWith(speechHandle);
    if (!this.realtimeSession) {
      throw new Error("realtime session is not initialized");
    }
    if (!(this.llm instanceof RealtimeModel)) {
      throw new Error("llm is not a realtime model");
    }
    this.logger.debug(
      { speech_id: speechHandle.id, stepIndex: speechHandle.numSteps },
      "realtime generation started"
    );
    const audioOutput = this.agentSession.output.audioEnabled ? this.agentSession.output.audio : null;
    const textOutput = this.agentSession.output.transcriptionEnabled ? this.agentSession.output.transcription : null;
    const toolCtx = this.realtimeSession.tools;
    await speechHandle.waitIfNotInterrupted([speechHandle._waitForAuthorization()]);
    speechHandle._clearAuthorization();
    if (speechHandle.interrupted) {
      return;
    }
    const onFirstFrame = () => {
      this.agentSession._updateAgentState("speaking");
    };
    const readMessages = async (abortController, outputs) => {
      replyAbortController.signal.addEventListener("abort", () => abortController.abort(), {
        once: true
      });
      const forwardTasks = [];
      try {
        for await (const msg of ev.messageStream) {
          if (forwardTasks.length > 0) {
            this.logger.warn(
              "expected to receive only one message generation from the realtime API"
            );
            break;
          }
          const trNodeResult = await this.agent.transcriptionNode(msg.textStream, modelSettings);
          let textOut = null;
          if (trNodeResult) {
            const [textForwardTask, _textOut] = performTextForwarding(
              trNodeResult,
              abortController,
              textOutput
            );
            forwardTasks.push(textForwardTask);
            textOut = _textOut;
          }
          let audioOut = null;
          if (audioOutput) {
            const realtimeAudio = await this.agent.realtimeAudioOutputNode(
              msg.audioStream,
              modelSettings
            );
            if (realtimeAudio) {
              const [forwardTask, _audioOut] = performAudioForwarding(
                realtimeAudio,
                audioOutput,
                abortController
              );
              forwardTasks.push(forwardTask);
              audioOut = _audioOut;
              audioOut.firstFrameFut.await.finally(onFirstFrame);
            } else {
              this.logger.warn(
                "audio output is enabled but neither tts nor realtime audio is available"
              );
            }
          } else if (textOut) {
            textOut.firstTextFut.await.finally(onFirstFrame);
          }
          outputs.push([msg.messageId, textOut, audioOut]);
        }
        await waitFor(forwardTasks);
      } catch (error) {
        this.logger.error(error, "error reading messages from the realtime API");
      } finally {
        await cancelAndWait(forwardTasks, AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      }
    };
    const messageOutputs = [];
    const tasks = [
      Task.from(
        (controller) => readMessages(controller, messageOutputs),
        void 0,
        "AgentActivity.realtime_generation.read_messages"
      )
    ];
    const [toolCallStream, toolCallStreamForTracing] = ev.functionStream.tee();
    const toolCalls = [];
    const readToolStreamTask = async (controller, stream) => {
      const reader = stream.getReader();
      try {
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          this.logger.debug({ tool_call: value }, "received tool call from the realtime API");
          toolCalls.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    };
    tasks.push(
      Task.from(
        (controller) => readToolStreamTask(controller, toolCallStreamForTracing),
        replyAbortController,
        "AgentActivity.realtime_generation.read_tool_stream"
      )
    );
    const onToolExecutionStarted = (f) => {
      speechHandle._itemAdded([f]);
    };
    const onToolExecutionCompleted = (out) => {
      if (out.toolCallOutput) {
        speechHandle._itemAdded([out.toolCallOutput]);
      }
    };
    const [executeToolsTask, toolOutput] = performToolExecutions({
      session: this.agentSession,
      speechHandle,
      toolCtx,
      toolCallStream,
      toolChoice: modelSettings.toolChoice,
      controller: replyAbortController,
      onToolExecutionStarted,
      onToolExecutionCompleted
    });
    await speechHandle.waitIfNotInterrupted(tasks.map((task) => task.result));
    if (audioOutput) {
      await speechHandle.waitIfNotInterrupted([audioOutput.waitForPlayout()]);
      this.agentSession._updateAgentState("listening");
    }
    if (speechHandle.interrupted) {
      this.logger.debug(
        { speech_id: speechHandle.id },
        "Aborting all realtime generation tasks due to interruption"
      );
      replyAbortController.abort();
      await cancelAndWait(tasks, AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      if (messageOutputs.length > 0) {
        const [msgId, textOut, audioOut] = messageOutputs[0];
        let forwardedText = (textOut == null ? void 0 : textOut.text) || "";
        if (audioOutput) {
          audioOutput.clearBuffer();
          const playbackEv = await audioOutput.waitForPlayout();
          let playbackPosition = playbackEv.playbackPosition;
          if (audioOut == null ? void 0 : audioOut.firstFrameFut.done) {
            this.logger.info(
              { speech_id: speechHandle.id, playbackPosition: playbackEv.playbackPosition },
              "playout interrupted"
            );
            if (playbackEv.synchronizedTranscript) {
              forwardedText = playbackEv.synchronizedTranscript;
            }
          } else {
            forwardedText = "";
            playbackPosition = 0;
          }
          this.realtimeSession.truncate({
            messageId: msgId,
            audioEndMs: Math.floor(playbackPosition)
          });
        }
        if (forwardedText) {
          const message = ChatMessage.create({
            role: "assistant",
            content: forwardedText,
            id: msgId,
            interrupted: true
          });
          this.agent._chatCtx.insert(message);
          speechHandle._itemAdded([message]);
          this.agentSession._conversationItemAdded(message);
        }
        this.logger.info(
          { speech_id: speechHandle.id, message: forwardedText },
          "playout completed with interrupt"
        );
      }
      speechHandle._markGenerationDone();
      await executeToolsTask.cancelAndWait(AgentActivity.REPLY_TASK_CANCEL_TIMEOUT);
      return;
    }
    if (messageOutputs.length > 0) {
      const [msgId, textOut, _] = messageOutputs[0];
      const message = ChatMessage.create({
        role: "assistant",
        content: (textOut == null ? void 0 : textOut.text) || "",
        id: msgId,
        interrupted: false
      });
      this.agent._chatCtx.insert(message);
      speechHandle._itemAdded([message]);
      this.agentSession._conversationItemAdded(message);
    }
    speechHandle._markGenerationDone();
    toolOutput.firstToolStartedFuture.await.finally(() => {
      this.agentSession._updateAgentState("thinking");
    });
    await executeToolsTask.result;
    if (toolOutput.output.length === 0) return;
    const { maxToolSteps } = this.agentSession.options;
    if (speechHandle.numSteps >= maxToolSteps) {
      this.logger.warn(
        { speech_id: speechHandle.id, max_tool_steps: maxToolSteps },
        "maximum number of function calls steps reached"
      );
      return;
    }
    const functionToolsExecutedEvent = createFunctionToolsExecutedEvent({
      functionCalls: [],
      functionCallOutputs: []
    });
    let shouldGenerateToolReply = false;
    let newAgentTask = null;
    let ignoreTaskSwitch = false;
    for (const sanitizedOut of toolOutput.output) {
      if (sanitizedOut.toolCallOutput !== void 0) {
        functionToolsExecutedEvent.functionCallOutputs.push(sanitizedOut.toolCallOutput);
        if (sanitizedOut.replyRequired) {
          shouldGenerateToolReply = true;
        }
      }
      if (newAgentTask !== null && sanitizedOut.agentTask !== void 0) {
        this.logger.error("expected to receive only one agent task from the tool executions");
        ignoreTaskSwitch = true;
      }
      newAgentTask = sanitizedOut.agentTask ?? null;
      this.logger.debug(
        {
          speechId: speechHandle.id,
          name: (_a = sanitizedOut.toolCall) == null ? void 0 : _a.name,
          args: sanitizedOut.toolCall.args,
          output: (_b = sanitizedOut.toolCallOutput) == null ? void 0 : _b.output,
          isError: (_c = sanitizedOut.toolCallOutput) == null ? void 0 : _c.isError
        },
        "Tool call execution finished"
      );
    }
    this.agentSession.emit(
      AgentSessionEventTypes.FunctionToolsExecuted,
      functionToolsExecutedEvent
    );
    let draining = this.draining;
    if (!ignoreTaskSwitch && newAgentTask !== null) {
      this.agentSession.updateAgent(newAgentTask);
      draining = true;
    }
    if (functionToolsExecutedEvent.functionCallOutputs.length > 0) {
      while (this.currentSpeech || this.speechQueue.size() > 0) {
        if (this.currentSpeech && !this.currentSpeech.done() && this.currentSpeech !== speechHandle) {
          await this.currentSpeech.waitForPlayout();
        } else {
          await new Promise((resolve) => setImmediate(resolve));
        }
      }
      const chatCtx = this.realtimeSession.chatCtx.copy();
      chatCtx.items.push(...functionToolsExecutedEvent.functionCallOutputs);
      try {
        await this.realtimeSession.updateChatCtx(chatCtx);
      } catch (error) {
        this.logger.warn(
          { error },
          "failed to update chat context before generating the function calls results"
        );
      }
    }
    if (!shouldGenerateToolReply || this.llm.capabilities.autoToolReplyGeneration) {
      return;
    }
    this.realtimeSession.interrupt();
    const replySpeechHandle = SpeechHandle.create({
      allowInterruptions: speechHandle.allowInterruptions,
      stepIndex: speechHandle.numSteps + 1,
      parent: speechHandle
    });
    this.agentSession.emit(
      AgentSessionEventTypes.SpeechCreated,
      createSpeechCreatedEvent({
        userInitiated: false,
        source: "tool_response",
        speechHandle: replySpeechHandle
      })
    );
    const toolChoice = draining || modelSettings.toolChoice === "none" ? "none" : "auto";
    this.createSpeechTask({
      task: Task.from(
        (abortController) => this.realtimeReplyTask({
          speechHandle: replySpeechHandle,
          modelSettings: { toolChoice },
          abortController
        })
      ),
      ownedSpeechHandle: replySpeechHandle,
      name: "AgentActivity.realtime_reply"
    });
    this.scheduleSpeech(replySpeechHandle, SpeechHandle.SPEECH_PRIORITY_NORMAL, true);
  }
  async realtimeReplyTask({
    speechHandle,
    modelSettings: { toolChoice },
    userInput,
    instructions,
    abortController
  }) {
    speechHandleStorage.enterWith(speechHandle);
    if (!this.realtimeSession) {
      throw new Error("realtime session is not available");
    }
    await speechHandle.waitIfNotInterrupted([speechHandle._waitForAuthorization()]);
    if (userInput) {
      const chatCtx = this.realtimeSession.chatCtx.copy();
      const message = chatCtx.addMessage({
        role: "user",
        content: userInput
      });
      await this.realtimeSession.updateChatCtx(chatCtx);
      this.agent._chatCtx.insert(message);
      this.agentSession._conversationItemAdded(message);
    }
    const originalToolChoice = this.toolChoice;
    if (toolChoice !== void 0) {
      this.realtimeSession.updateOptions({ toolChoice });
    }
    try {
      const generationEvent = await this.realtimeSession.generateReply(instructions);
      await this.realtimeGenerationTask(
        speechHandle,
        generationEvent,
        { toolChoice },
        abortController
      );
    } finally {
      if (toolChoice !== void 0 && toolChoice !== originalToolChoice) {
        this.realtimeSession.updateOptions({ toolChoice: originalToolChoice });
      }
    }
  }
  scheduleSpeech(speechHandle, priority, force = false) {
    if (this.draining && !force) {
      throw new Error("cannot schedule new speech, the agent is draining");
    }
    this.speechQueue.push([priority, Number(process.hrtime.bigint()), speechHandle]);
    speechHandle._markScheduled();
    this.wakeupMainTask();
  }
  async drain() {
    var _a;
    const unlock = await this.lock.lock();
    try {
      if (this._draining) return;
      this.createSpeechTask({
        task: Task.from(() => this.agent.onExit()),
        name: "AgentActivity_onExit"
      });
      this.wakeupMainTask();
      this._draining = true;
      await ((_a = this._mainTask) == null ? void 0 : _a.result);
    } finally {
      unlock();
    }
  }
  async close() {
    var _a, _b, _c;
    const unlock = await this.lock.lock();
    try {
      if (!this._draining) {
        this.logger.warn("task closing without draining");
      }
      if (this.llm instanceof LLM) {
        this.llm.off("metrics_collected", this.onMetricsCollected);
      }
      if (this.realtimeSession) {
        this.realtimeSession.off("generation_created", this.onGenerationCreated);
        this.realtimeSession.off("input_speech_started", this.onInputSpeechStarted);
        this.realtimeSession.off("input_speech_stopped", this.onInputSpeechStopped);
        this.realtimeSession.off(
          "input_audio_transcription_completed",
          this.onInputAudioTranscriptionCompleted
        );
        this.realtimeSession.off("metrics_collected", this.onMetricsCollected);
      }
      if (this.stt instanceof STT) {
        this.stt.off("metrics_collected", this.onMetricsCollected);
      }
      if (this.tts instanceof TTS) {
        this.tts.off("metrics_collected", this.onMetricsCollected);
      }
      if (this.vad instanceof VAD) {
        this.vad.off("metrics_collected", this.onMetricsCollected);
      }
      this.detachAudioInput();
      await ((_a = this.realtimeSession) == null ? void 0 : _a.close());
      await ((_b = this.audioRecognition) == null ? void 0 : _b.close());
      await ((_c = this._mainTask) == null ? void 0 : _c.cancelAndWait());
    } finally {
      unlock();
    }
  }
}
function toOaiToolChoice(toolChoice) {
  return toolChoice !== null ? toolChoice : void 0;
}
export {
  AgentActivity
};
//# sourceMappingURL=agent_activity.js.map