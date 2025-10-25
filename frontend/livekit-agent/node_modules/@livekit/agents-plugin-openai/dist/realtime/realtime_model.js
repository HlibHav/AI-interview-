import {
  APIConnectionError,
  APIError,
  AudioByteStream,
  DEFAULT_API_CONNECT_OPTIONS,
  Future,
  Queue,
  Task,
  cancelAndWait,
  delay,
  isAPIError,
  llm,
  log,
  shortuuid,
  stream
} from "@livekit/agents";
import { Mutex } from "@livekit/mutex";
import { AudioFrame, combineAudioFrames } from "@livekit/rtc-node";
import { WebSocket } from "ws";
import * as api_proto from "./api_proto.js";
const lkOaiDebug = process.env.LK_OPENAI_DEBUG ? Number(process.env.LK_OPENAI_DEBUG) : 0;
const SAMPLE_RATE = 24e3;
const NUM_CHANNELS = 1;
const BASE_URL = "https://api.openai.com/v1";
const MOCK_AUDIO_ID_PREFIX = "lk_mock_audio_item_";
class CreateResponseHandle {
  instructions;
  doneFut;
  // TODO(shubhra): add timeout
  constructor({ instructions }) {
    this.instructions = instructions;
    this.doneFut = new Future();
  }
}
const DEFAULT_FIRST_RETRY_INTERVAL_MS = 100;
const DEFAULT_TEMPERATURE = 0.8;
const DEFAULT_TURN_DETECTION = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 200,
  create_response: true,
  interrupt_response: true
};
const DEFAULT_INPUT_AUDIO_TRANSCRIPTION = {
  model: "gpt-4o-mini-transcribe"
};
const DEFAULT_TOOL_CHOICE = "auto";
const DEFAULT_MAX_RESPONSE_OUTPUT_TOKENS = "inf";
const AZURE_DEFAULT_INPUT_AUDIO_TRANSCRIPTION = {
  model: "whisper-1"
};
const AZURE_DEFAULT_TURN_DETECTION = {
  type: "server_vad",
  threshold: 0.5,
  prefix_padding_ms: 300,
  silence_duration_ms: 200,
  create_response: true
};
const DEFAULT_MAX_SESSION_DURATION = 20 * 60 * 1e3;
const DEFAULT_REALTIME_MODEL_OPTIONS = {
  model: "gpt-realtime",
  voice: "marin",
  temperature: DEFAULT_TEMPERATURE,
  inputAudioTranscription: DEFAULT_INPUT_AUDIO_TRANSCRIPTION,
  turnDetection: DEFAULT_TURN_DETECTION,
  toolChoice: DEFAULT_TOOL_CHOICE,
  maxResponseOutputTokens: DEFAULT_MAX_RESPONSE_OUTPUT_TOKENS,
  maxSessionDuration: DEFAULT_MAX_SESSION_DURATION,
  connOptions: DEFAULT_API_CONNECT_OPTIONS
};
class RealtimeModel extends llm.RealtimeModel {
  sampleRate = api_proto.SAMPLE_RATE;
  numChannels = api_proto.NUM_CHANNELS;
  inFrameSize = api_proto.IN_FRAME_SIZE;
  outFrameSize = api_proto.OUT_FRAME_SIZE;
  /* @internal */
  _options;
  constructor(options = {}) {
    super({
      messageTruncation: true,
      turnDetection: options.turnDetection !== null,
      userTranscription: options.inputAudioTranscription !== null,
      autoToolReplyGeneration: false
    });
    const isAzure = !!(options.apiVersion || options.entraToken || options.azureDeployment);
    if (options.apiKey === "" && !isAzure) {
      throw new Error(
        "OpenAI API key is required, either using the argument or by setting the OPENAI_API_KEY environment variable"
      );
    }
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey && !isAzure) {
      throw new Error(
        "OpenAI API key is required, either using the argument or by setting the OPENAI_API_KEY environment variable"
      );
    }
    if (!options.baseURL && isAzure) {
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      if (!azureEndpoint) {
        throw new Error(
          "Missing Azure endpoint. Please pass base_url or set AZURE_OPENAI_ENDPOINT environment variable."
        );
      }
      options.baseURL = `${azureEndpoint.replace(/\/$/, "")}/openai`;
    }
    this._options = {
      ...DEFAULT_REALTIME_MODEL_OPTIONS,
      ...options,
      baseURL: options.baseURL || BASE_URL,
      apiKey,
      isAzure,
      model: options.model || DEFAULT_REALTIME_MODEL_OPTIONS.model
    };
  }
  /**
   * Create a RealtimeModel instance configured for Azure OpenAI Service.
   *
   * @param azureDeployment - The name of your Azure OpenAI deployment.
   * @param azureEndpoint - The endpoint URL for your Azure OpenAI resource. If undefined, will attempt to read from the environment variable AZURE_OPENAI_ENDPOINT.
   * @param apiVersion - API version to use with Azure OpenAI Service. If undefined, will attempt to read from the environment variable OPENAI_API_VERSION.
   * @param apiKey - Azure OpenAI API key. If undefined, will attempt to read from the environment variable AZURE_OPENAI_API_KEY.
   * @param entraToken - Azure Entra authentication token. Required if not using API key authentication.
   * @param baseURL - Base URL for the API endpoint. If undefined, constructed from the azure_endpoint.
   * @param voice - Voice setting for audio outputs. Defaults to "alloy".
   * @param inputAudioTranscription - Options for transcribing input audio. Defaults to @see DEFAULT_INPUT_AUDIO_TRANSCRIPTION.
   * @param turnDetection - Options for server-based voice activity detection (VAD). Defaults to @see DEFAULT_SERVER_VAD_OPTIONS.
   * @param temperature - Sampling temperature for response generation. Defaults to @see DEFAULT_TEMPERATURE.
   * @param speed - Speed of the audio output. Defaults to 1.0.
   * @param maxResponseOutputTokens - Maximum number of tokens in the response. Defaults to @see DEFAULT_MAX_RESPONSE_OUTPUT_TOKENS.
   * @param maxSessionDuration - Maximum duration of the session in milliseconds. Defaults to @see DEFAULT_MAX_SESSION_DURATION.
   *
   * @returns A RealtimeModel instance configured for Azure OpenAI Service.
   *
   * @throws Error if required Azure parameters are missing or invalid.
   */
  static withAzure({
    azureDeployment,
    azureEndpoint,
    apiVersion,
    apiKey,
    entraToken,
    baseURL,
    voice = "alloy",
    inputAudioTranscription = AZURE_DEFAULT_INPUT_AUDIO_TRANSCRIPTION,
    turnDetection = AZURE_DEFAULT_TURN_DETECTION,
    temperature = 0.8,
    speed
  }) {
    apiKey = apiKey || process.env.AZURE_OPENAI_API_KEY;
    if (!apiKey && !entraToken) {
      throw new Error(
        "Missing credentials. Please pass one of `apiKey`, `entraToken`, or the `AZURE_OPENAI_API_KEY` environment variable."
      );
    }
    apiVersion = apiVersion || process.env.OPENAI_API_VERSION;
    if (!apiVersion) {
      throw new Error(
        "Must provide either the `apiVersion` argument or the `OPENAI_API_VERSION` environment variable"
      );
    }
    if (!baseURL) {
      azureEndpoint = azureEndpoint || process.env.AZURE_OPENAI_ENDPOINT;
      if (!azureEndpoint) {
        throw new Error(
          "Missing Azure endpoint. Please pass the `azure_endpoint` parameter or set the `AZURE_OPENAI_ENDPOINT` environment variable."
        );
      }
      baseURL = `${azureEndpoint.replace(/\/$/, "")}/openai`;
    }
    return new RealtimeModel({
      voice,
      inputAudioTranscription,
      turnDetection,
      temperature,
      speed,
      apiKey,
      azureDeployment,
      apiVersion,
      entraToken,
      baseURL
    });
  }
  session() {
    return new RealtimeSession(this);
  }
  async close() {
    return;
  }
}
function processBaseURL({
  baseURL,
  model,
  isAzure = false,
  azureDeployment,
  apiVersion
}) {
  const url = new URL([baseURL, "realtime"].join("/"));
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  }
  if (!url.pathname || ["", "/v1", "/openai"].includes(url.pathname.replace(/\/$/, ""))) {
    url.pathname = url.pathname.replace(/\/$/, "") + "/realtime";
  } else {
    url.pathname = url.pathname.replace(/\/$/, "");
  }
  const queryParams = {};
  if (isAzure) {
    if (apiVersion) {
      queryParams["api-version"] = apiVersion;
    }
    if (azureDeployment) {
      queryParams["deployment"] = azureDeployment;
    }
  } else {
    queryParams["model"] = model;
  }
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
class RealtimeSession extends llm.RealtimeSession {
  _tools = {};
  remoteChatCtx = new llm.RemoteChatContext();
  messageChannel = new Queue();
  inputResampler;
  instructions;
  oaiRealtimeModel;
  currentGeneration;
  responseCreatedFutures = {};
  textModeRecoveryRetries = 0;
  itemCreateFutures = {};
  itemDeleteFutures = {};
  updateChatCtxLock = new Mutex();
  updateFuncCtxLock = new Mutex();
  // 100ms chunks
  bstream = new AudioByteStream(SAMPLE_RATE, NUM_CHANNELS, SAMPLE_RATE / 10);
  pushedDurationMs = 0;
  #logger = log();
  #task;
  #closed = false;
  constructor(realtimeModel) {
    super(realtimeModel);
    this.oaiRealtimeModel = realtimeModel;
    this.#task = Task.from(({ signal }) => this.#mainTask(signal));
    this.sendEvent(this.createSessionUpdateEvent());
  }
  sendEvent(command) {
    this.messageChannel.put(command);
  }
  createSessionUpdateEvent() {
    return {
      type: "session.update",
      session: {
        model: this.oaiRealtimeModel._options.model,
        voice: this.oaiRealtimeModel._options.voice,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        modalities: ["text", "audio"],
        turn_detection: this.oaiRealtimeModel._options.turnDetection,
        input_audio_transcription: this.oaiRealtimeModel._options.inputAudioTranscription,
        // TODO(shubhra): add inputAudioNoiseReduction
        temperature: this.oaiRealtimeModel._options.temperature,
        tool_choice: toOaiToolChoice(this.oaiRealtimeModel._options.toolChoice),
        max_response_output_tokens: this.oaiRealtimeModel._options.maxResponseOutputTokens === Infinity ? "inf" : this.oaiRealtimeModel._options.maxResponseOutputTokens,
        // TODO(shubhra): add tracing options
        instructions: this.instructions,
        speed: this.oaiRealtimeModel._options.speed
      }
    };
  }
  get chatCtx() {
    return this.remoteChatCtx.toChatCtx();
  }
  get tools() {
    return { ...this._tools };
  }
  async updateChatCtx(_chatCtx) {
    const unlock = await this.updateChatCtxLock.lock();
    const events = this.createChatCtxUpdateEvents(_chatCtx);
    const futures = [];
    for (const event of events) {
      const future = new Future();
      futures.push(future);
      if (event.type === "conversation.item.create") {
        this.itemCreateFutures[event.item.id] = future;
      } else if (event.type == "conversation.item.delete") {
        this.itemDeleteFutures[event.item_id] = future;
      }
      this.sendEvent(event);
    }
    if (futures.length === 0) {
      unlock();
      return;
    }
    try {
      await Promise.race([
        Promise.all(futures),
        delay(5e3).then(() => {
          throw new Error("Chat ctx update events timed out");
        })
      ]);
    } catch (e) {
      this.#logger.error(e.message);
      throw e;
    } finally {
      unlock();
    }
  }
  createChatCtxUpdateEvents(chatCtx, addMockAudio = false) {
    const newChatCtx = chatCtx.copy();
    if (addMockAudio) {
      newChatCtx.items.push(createMockAudioItem());
    } else {
      newChatCtx.items = newChatCtx.items.filter(
        (item) => !item.id.startsWith(MOCK_AUDIO_ID_PREFIX)
      );
    }
    const events = [];
    const diffOps = llm.computeChatCtxDiff(this.chatCtx, newChatCtx);
    for (const op of diffOps.toRemove) {
      events.push({
        type: "conversation.item.delete",
        item_id: op,
        event_id: shortuuid("chat_ctx_delete_")
      });
    }
    for (const [previousId, id] of diffOps.toCreate) {
      const chatItem = newChatCtx.getById(id);
      if (!chatItem) {
        throw new Error(`Chat item ${id} not found`);
      }
      events.push({
        type: "conversation.item.create",
        item: livekitItemToOpenAIItem(chatItem),
        previous_item_id: previousId ?? void 0,
        event_id: shortuuid("chat_ctx_create_")
      });
    }
    return events;
  }
  async updateTools(_tools) {
    const unlock = await this.updateFuncCtxLock.lock();
    const ev = this.createToolsUpdateEvent(_tools);
    this.sendEvent(ev);
    if (!ev.session.tools) {
      throw new Error("Tools are missing in the session update event");
    }
    const retainedToolNames = new Set(ev.session.tools.map((tool) => tool.name));
    const retainedTools = Object.fromEntries(
      Object.entries(_tools).filter(
        ([name, tool]) => llm.isFunctionTool(tool) && retainedToolNames.has(name)
      )
    );
    this._tools = retainedTools;
    unlock();
  }
  createToolsUpdateEvent(_tools) {
    const oaiTools = [];
    for (const [name, tool] of Object.entries(_tools)) {
      if (!llm.isFunctionTool(tool)) {
        this.#logger.error({ name, tool }, "OpenAI Realtime API doesn't support this tool type");
        continue;
      }
      const { parameters: toolParameters, description } = tool;
      try {
        const parameters = llm.toJsonSchema(
          toolParameters
        );
        oaiTools.push({
          name,
          description,
          parameters,
          type: "function"
        });
      } catch (e) {
        this.#logger.error({ name, tool }, "OpenAI Realtime API doesn't support this tool type");
        continue;
      }
    }
    return {
      type: "session.update",
      session: {
        model: this.oaiRealtimeModel._options.model,
        tools: oaiTools
      },
      event_id: shortuuid("tools_update_")
    };
  }
  async updateInstructions(_instructions) {
    const eventId = shortuuid("instructions_update_");
    this.sendEvent({
      type: "session.update",
      session: {
        instructions: _instructions
      },
      event_id: eventId
    });
    this.instructions = _instructions;
  }
  updateOptions({ toolChoice }) {
    const options = {};
    this.oaiRealtimeModel._options.toolChoice = toolChoice;
    options.tool_choice = toOaiToolChoice(toolChoice);
    this.sendEvent({
      type: "session.update",
      session: options,
      event_id: shortuuid("options_update_")
    });
  }
  pushAudio(frame) {
    for (const f of this.resampleAudio(frame)) {
      for (const nf of this.bstream.write(f.data.buffer)) {
        this.sendEvent({
          type: "input_audio_buffer.append",
          audio: Buffer.from(nf.data.buffer).toString("base64")
        });
        this.pushedDurationMs += nf.samplesPerChannel / nf.sampleRate * 1e3;
      }
    }
  }
  async commitAudio() {
    if (this.pushedDurationMs > 100) {
      this.sendEvent({
        type: "input_audio_buffer.commit"
      });
      this.pushedDurationMs = 0;
    }
  }
  async clearAudio() {
    this.sendEvent({
      type: "input_audio_buffer.clear"
    });
    this.pushedDurationMs = 0;
  }
  async generateReply(instructions) {
    const handle = this.createResponse({ instructions, userInitiated: true });
    this.textModeRecoveryRetries = 0;
    return handle.doneFut.await;
  }
  async interrupt() {
    this.sendEvent({
      type: "response.cancel"
    });
  }
  async truncate(_options) {
    this.sendEvent({
      type: "conversation.item.truncate",
      content_index: 0,
      item_id: _options.messageId,
      audio_end_ms: _options.audioEndMs
    });
  }
  loggableEvent(event) {
    const untypedEvent = {};
    for (const [key, value] of Object.entries(event)) {
      if (value !== void 0) {
        untypedEvent[key] = value;
      }
    }
    if (untypedEvent.audio && typeof untypedEvent.audio === "string") {
      return { ...untypedEvent, audio: "..." };
    }
    if (untypedEvent.delta && typeof untypedEvent.delta === "string" && event.type === "response.audio.delta") {
      return { ...untypedEvent, delta: "..." };
    }
    return untypedEvent;
  }
  async createWsConn() {
    const headers = {
      "User-Agent": "LiveKit-Agents-JS"
    };
    if (this.oaiRealtimeModel._options.isAzure) {
      if (this.oaiRealtimeModel._options.entraToken) {
        headers.Authorization = `Bearer ${this.oaiRealtimeModel._options.entraToken}`;
      } else if (this.oaiRealtimeModel._options.apiKey) {
        headers["api-key"] = this.oaiRealtimeModel._options.apiKey;
      } else {
        throw new Error("Microsoft API key or entraToken is required");
      }
    } else {
      headers.Authorization = `Bearer ${this.oaiRealtimeModel._options.apiKey}`;
      headers["OpenAI-Beta"] = "realtime=v1";
    }
    const url = processBaseURL({
      baseURL: this.oaiRealtimeModel._options.baseURL,
      model: this.oaiRealtimeModel._options.model,
      isAzure: this.oaiRealtimeModel._options.isAzure,
      apiVersion: this.oaiRealtimeModel._options.apiVersion,
      azureDeployment: this.oaiRealtimeModel._options.azureDeployment
    });
    if (lkOaiDebug) {
      this.#logger.debug(`Connecting to OpenAI Realtime API at ${url}`);
    }
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, { headers });
      let waiting = true;
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket connection timeout"));
      }, this.oaiRealtimeModel._options.connOptions.timeoutMs);
      ws.once("open", () => {
        if (!waiting) return;
        waiting = false;
        clearTimeout(timeout);
        resolve(ws);
      });
      ws.once("close", () => {
        if (!waiting) return;
        waiting = false;
        clearTimeout(timeout);
        reject(new Error("OpenAI Realtime API connection closed"));
      });
    });
  }
  async #mainTask(signal) {
    let reconnecting = false;
    let numRetries = 0;
    let wsConn = null;
    const maxRetries = this.oaiRealtimeModel._options.connOptions.maxRetry;
    const reconnect = async () => {
      this.#logger.debug(
        {
          maxSessionDuration: this.oaiRealtimeModel._options.maxSessionDuration
        },
        "Reconnecting to OpenAI Realtime API"
      );
      const events = [];
      events.push(this.createSessionUpdateEvent());
      if (Object.keys(this._tools).length > 0) {
        events.push(this.createToolsUpdateEvent(this._tools));
      }
      const chatCtx = this.chatCtx.copy({
        excludeFunctionCall: true,
        excludeInstructions: true,
        excludeEmptyMessage: true
      });
      const oldChatCtx = this.remoteChatCtx;
      this.remoteChatCtx = new llm.RemoteChatContext();
      events.push(...this.createChatCtxUpdateEvents(chatCtx));
      try {
        for (const ev of events) {
          this.emit("openai_client_event_queued", ev);
          wsConn.send(JSON.stringify(ev));
        }
      } catch (error) {
        this.remoteChatCtx = oldChatCtx;
        throw new APIConnectionError({
          message: "Failed to send message to OpenAI Realtime API during session re-connection"
        });
      }
      this.#logger.debug("Reconnected to OpenAI Realtime API");
      this.emit("session_reconnected", {});
    };
    reconnecting = false;
    while (!this.#closed && !signal.aborted) {
      this.#logger.debug("Creating WebSocket connection to OpenAI Realtime API");
      wsConn = await this.createWsConn();
      if (signal.aborted) break;
      try {
        if (reconnecting) {
          await reconnect();
          if (signal.aborted) break;
          numRetries = 0;
        }
        await this.runWs(wsConn);
        if (signal.aborted) break;
      } catch (error) {
        if (!isAPIError(error)) {
          this.emitError({ error, recoverable: false });
          throw error;
        }
        if (maxRetries === 0 || !error.retryable) {
          this.emitError({ error, recoverable: false });
          throw error;
        }
        if (numRetries === maxRetries) {
          this.emitError({ error, recoverable: false });
          throw new APIConnectionError({
            message: `OpenAI Realtime API connection failed after ${numRetries} attempts`,
            options: {
              body: error,
              retryable: false
            }
          });
        }
        this.emitError({ error, recoverable: true });
        const retryInterval = numRetries === 0 ? DEFAULT_FIRST_RETRY_INTERVAL_MS : this.oaiRealtimeModel._options.connOptions.retryIntervalMs;
        this.#logger.warn(
          {
            attempt: numRetries,
            maxRetries,
            error
          },
          `OpenAI Realtime API connection failed, retrying in ${retryInterval / 1e3}s`
        );
        await delay(retryInterval);
        numRetries++;
      }
      reconnecting = true;
    }
  }
  async runWs(wsConn) {
    const forwardEvents = async (signal) => {
      const abortFuture = new Future();
      signal.addEventListener("abort", () => abortFuture.resolve());
      while (!this.#closed && wsConn.readyState === WebSocket.OPEN && !signal.aborted) {
        try {
          const event = await Promise.race([this.messageChannel.get(), abortFuture.await]);
          if (signal.aborted || abortFuture.done || event === void 0) {
            break;
          }
          if (lkOaiDebug) {
            this.#logger.debug(this.loggableEvent(event), `(client) -> ${event.type}`);
          }
          this.emit("openai_client_event_queued", event);
          wsConn.send(JSON.stringify(event));
        } catch (error) {
          break;
        }
      }
      wsConn.close();
    };
    const wsCloseFuture = new Future();
    wsConn.onerror = (error) => {
      wsCloseFuture.resolve(new APIConnectionError({ message: error.message }));
    };
    wsConn.onclose = () => {
      wsCloseFuture.resolve();
    };
    wsConn.onmessage = (message) => {
      const event = JSON.parse(message.data);
      this.emit("openai_server_event_received", event);
      if (lkOaiDebug) {
        this.#logger.debug(this.loggableEvent(event), `(server) <- ${event.type}`);
      }
      switch (event.type) {
        case "input_audio_buffer.speech_started":
          this.handleInputAudioBufferSpeechStarted(event);
          break;
        case "input_audio_buffer.speech_stopped":
          this.handleInputAudioBufferSpeechStopped(event);
          break;
        case "response.created":
          this.handleResponseCreated(event);
          break;
        case "response.output_item.added":
          this.handleResponseOutputItemAdded(event);
          break;
        case "conversation.item.created":
          this.handleConversationItemCreated(event);
          break;
        case "conversation.item.deleted":
          this.handleConversationItemDeleted(event);
          break;
        case "conversation.item.input_audio_transcription.completed":
          this.handleConversationItemInputAudioTranscriptionCompleted(event);
          break;
        case "conversation.item.input_audio_transcription.failed":
          this.handleConversationItemInputAudioTranscriptionFailed(event);
          break;
        case "response.content_part.added":
          this.handleResponseContentPartAdded(event);
          break;
        case "response.content_part.done":
          this.handleResponseContentPartDone(event);
          break;
        case "response.audio_transcript.delta":
          this.handleResponseAudioTranscriptDelta(event);
          break;
        case "response.audio.delta":
          this.handleResponseAudioDelta(event);
          break;
        case "response.audio_transcript.done":
          this.handleResponseAudioTranscriptDone(event);
          break;
        case "response.audio.done":
          this.handleResponseAudioDone(event);
          break;
        case "response.output_item.done":
          this.handleResponseOutputItemDone(event);
          break;
        case "response.done":
          this.handleResponseDone(event);
          break;
        case "error":
          this.handleError(event);
          break;
        default:
          if (lkOaiDebug) {
            this.#logger.debug(`unhandled event: ${event.type}`);
          }
          break;
      }
    };
    const sendTask = Task.from(({ signal }) => forwardEvents(signal));
    const wsTask = Task.from(({ signal }) => {
      const abortPromise = new Promise((resolve) => {
        signal.addEventListener("abort", () => {
          resolve();
        });
      });
      return Promise.race([wsCloseFuture.await, abortPromise]);
    });
    const waitReconnectTask = Task.from(async ({ signal }) => {
      await delay(this.oaiRealtimeModel._options.maxSessionDuration, { signal });
      return new APIConnectionError({
        message: "OpenAI Realtime API connection timeout"
      });
    });
    try {
      const result = await Promise.race([wsTask.result, sendTask.result, waitReconnectTask.result]);
      if (waitReconnectTask.done && this.currentGeneration) {
        await this.currentGeneration._doneFut.await;
      }
      if (result instanceof Error) {
        throw result;
      }
    } finally {
      await cancelAndWait([wsTask, sendTask, waitReconnectTask], 2e3);
      wsConn.close();
    }
  }
  async close() {
    super.close();
    this.#closed = true;
    await this.#task;
  }
  handleInputAudioBufferSpeechStarted(_event) {
    this.emit("input_speech_started", {});
  }
  handleInputAudioBufferSpeechStopped(_event) {
    this.emit("input_speech_stopped", {
      userTranscriptionEnabled: this.oaiRealtimeModel._options.inputAudioTranscription !== null
    });
  }
  handleResponseCreated(event) {
    var _a;
    if (!event.response.id) {
      throw new Error("response.id is missing");
    }
    this.currentGeneration = {
      messageChannel: stream.createStreamChannel(),
      functionChannel: stream.createStreamChannel(),
      messages: /* @__PURE__ */ new Map(),
      _doneFut: new Future(),
      _createdTimestamp: Date.now()
    };
    const generationEv = {
      messageStream: this.currentGeneration.messageChannel.stream(),
      functionStream: this.currentGeneration.functionChannel.stream(),
      userInitiated: false
    };
    const clientEventId = (_a = event.response.metadata) == null ? void 0 : _a.client_event_id;
    if (clientEventId) {
      const handle = this.responseCreatedFutures[clientEventId];
      if (handle) {
        delete this.responseCreatedFutures[clientEventId];
        generationEv.userInitiated = true;
        if (!handle.doneFut.done) {
          handle.doneFut.resolve(generationEv);
        }
      }
    }
    this.emit("generation_created", generationEv);
  }
  handleResponseOutputItemAdded(event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    if (!event.item.type) {
      throw new Error("item.type is not set");
    }
    if (!event.response_id) {
      throw new Error("response_id is not set");
    }
    const itemType = event.item.type;
    const responseId = event.response_id;
    if (itemType !== "message") {
      this.resolveGeneration(responseId);
      this.textModeRecoveryRetries = 0;
      return;
    }
  }
  handleConversationItemCreated(event) {
    if (!event.item.id) {
      throw new Error("item.id is not set");
    }
    try {
      this.remoteChatCtx.insert(event.previous_item_id, openAIItemToLivekitItem(event.item));
    } catch (error) {
      this.#logger.error({ error, itemId: event.item.id }, "failed to insert conversation item");
    }
    const fut = this.itemCreateFutures[event.item.id];
    if (fut) {
      fut.resolve();
      delete this.itemCreateFutures[event.item.id];
    }
  }
  handleConversationItemDeleted(event) {
    if (!event.item_id) {
      throw new Error("item_id is not set");
    }
    try {
      this.remoteChatCtx.delete(event.item_id);
    } catch (error) {
      this.#logger.error({ error, itemId: event.item_id }, "failed to delete conversation item");
    }
    const fut = this.itemDeleteFutures[event.item_id];
    if (fut) {
      fut.resolve();
      delete this.itemDeleteFutures[event.item_id];
    }
  }
  handleConversationItemInputAudioTranscriptionCompleted(event) {
    const remoteItem = this.remoteChatCtx.get(event.item_id);
    if (!remoteItem) {
      return;
    }
    const item = remoteItem.item;
    if (item instanceof llm.ChatMessage) {
      item.content.push(event.transcript);
    } else {
      throw new Error("item is not a chat message");
    }
    this.emit("input_audio_transcription_completed", {
      itemId: event.item_id,
      transcript: event.transcript,
      isFinal: true
    });
  }
  handleConversationItemInputAudioTranscriptionFailed(event) {
    this.#logger.error(
      { error: event.error },
      "OpenAI Realtime API failed to transcribe input audio"
    );
  }
  handleResponseContentPartAdded(event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    const itemId = event.item_id;
    const itemType = event.part.type;
    const responseId = event.response_id;
    if (itemType === "audio") {
      this.resolveGeneration(responseId);
      if (this.textModeRecoveryRetries > 0) {
        this.#logger.info(
          { retries: this.textModeRecoveryRetries },
          "recovered from text-only response"
        );
        this.textModeRecoveryRetries = 0;
      }
      const itemGeneration = {
        messageId: itemId,
        textChannel: stream.createStreamChannel(),
        audioChannel: stream.createStreamChannel(),
        audioTranscript: ""
      };
      this.currentGeneration.messageChannel.write({
        messageId: itemId,
        textStream: itemGeneration.textChannel.stream(),
        audioStream: itemGeneration.audioChannel.stream()
      });
      this.currentGeneration.messages.set(itemId, itemGeneration);
      this.currentGeneration._firstTokenTimestamp = Date.now();
      return;
    } else {
      this.interrupt();
      if (this.textModeRecoveryRetries === 0) {
        this.#logger.warn({ responseId }, "received text-only response from OpenAI Realtime API");
      }
    }
  }
  handleResponseContentPartDone(event) {
    if (event.part.type !== "text") {
      return;
    }
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
  }
  handleResponseAudioTranscriptDelta(event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    const itemId = event.item_id;
    const delta = event.delta;
    const itemGeneration = this.currentGeneration.messages.get(itemId);
    if (!itemGeneration) {
      throw new Error("itemGeneration is not set");
    } else {
      itemGeneration.textChannel.write(delta);
      itemGeneration.audioTranscript += delta;
    }
  }
  handleResponseAudioDelta(event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    const itemGeneration = this.currentGeneration.messages.get(event.item_id);
    if (!itemGeneration) {
      throw new Error("itemGeneration is not set");
    }
    const binaryString = atob(event.delta);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    itemGeneration.audioChannel.write(
      new AudioFrame(
        new Int16Array(bytes.buffer),
        api_proto.SAMPLE_RATE,
        api_proto.NUM_CHANNELS,
        bytes.length / 2
      )
    );
  }
  handleResponseAudioTranscriptDone(_event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
  }
  handleResponseAudioDone(_event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
  }
  handleResponseOutputItemDone(event) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    const itemId = event.item.id;
    const itemType = event.item.type;
    if (itemType === "function_call") {
      const item = event.item;
      if (!item.call_id || !item.name || !item.arguments) {
        throw new Error("item is not a function call");
      }
      this.currentGeneration.functionChannel.write({
        callId: item.call_id,
        name: item.name,
        args: item.arguments
      });
    } else if (itemType === "message") {
      const itemGeneration = this.currentGeneration.messages.get(itemId);
      if (!itemGeneration) {
        return;
      }
      itemGeneration.textChannel.close();
      itemGeneration.audioChannel.close();
    }
  }
  handleResponseDone(_event) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
    if (!this.currentGeneration) {
      return;
    }
    const createdTimestamp = this.currentGeneration._createdTimestamp;
    const firstTokenTimestamp = this.currentGeneration._firstTokenTimestamp;
    this.#logger.debug(
      {
        messageCount: this.currentGeneration.messages.size
      },
      "Closing generation channels in handleResponseDone"
    );
    for (const generation of this.currentGeneration.messages.values()) {
      generation.textChannel.close();
      generation.audioChannel.close();
    }
    this.currentGeneration.functionChannel.close();
    this.currentGeneration.messageChannel.close();
    for (const itemId of this.currentGeneration.messages.keys()) {
      const remoteItem = this.remoteChatCtx.get(itemId);
      if (remoteItem && remoteItem.item instanceof llm.ChatMessage) {
        remoteItem.item.content.push(this.currentGeneration.messages.get(itemId).audioTranscript);
      }
    }
    this.currentGeneration._doneFut.resolve();
    this.currentGeneration = void 0;
    const usage = _event.response.usage;
    const ttftMs = firstTokenTimestamp ? firstTokenTimestamp - createdTimestamp : -1;
    const durationMs = Date.now() - createdTimestamp;
    const realtimeMetrics = {
      type: "realtime_model_metrics",
      timestamp: createdTimestamp,
      requestId: _event.response.id || "",
      ttftMs,
      durationMs,
      cancelled: _event.response.status === "cancelled",
      label: "openai_realtime",
      inputTokens: (usage == null ? void 0 : usage.input_tokens) ?? 0,
      outputTokens: (usage == null ? void 0 : usage.output_tokens) ?? 0,
      totalTokens: (usage == null ? void 0 : usage.total_tokens) ?? 0,
      tokensPerSecond: durationMs > 0 ? ((usage == null ? void 0 : usage.output_tokens) ?? 0) / (durationMs / 1e3) : 0,
      inputTokenDetails: {
        audioTokens: ((_a = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _a.audio_tokens) ?? 0,
        textTokens: ((_b = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _b.text_tokens) ?? 0,
        imageTokens: 0,
        // Not supported yet
        cachedTokens: ((_c = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _c.cached_tokens) ?? 0,
        cachedTokensDetails: ((_d = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _d.cached_tokens_details) ? {
          audioTokens: ((_f = (_e = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _e.cached_tokens_details) == null ? void 0 : _f.audio_tokens) ?? 0,
          textTokens: ((_h = (_g = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _g.cached_tokens_details) == null ? void 0 : _h.text_tokens) ?? 0,
          imageTokens: ((_j = (_i = usage == null ? void 0 : usage.input_token_details) == null ? void 0 : _i.cached_tokens_details) == null ? void 0 : _j.image_tokens) ?? 0
        } : void 0
      },
      outputTokenDetails: {
        textTokens: ((_k = usage == null ? void 0 : usage.output_token_details) == null ? void 0 : _k.text_tokens) ?? 0,
        audioTokens: ((_l = usage == null ? void 0 : usage.output_token_details) == null ? void 0 : _l.audio_tokens) ?? 0,
        imageTokens: 0
      }
    };
    this.emit("metrics_collected", realtimeMetrics);
  }
  handleError(event) {
    if (event.error.message.startsWith("Cancellation failed")) {
      return;
    }
    this.#logger.error({ error: event.error }, "OpenAI Realtime API returned an error");
    this.emitError({
      error: new APIError(event.error.message, {
        body: event.error,
        retryable: true
      }),
      recoverable: true
    });
  }
  emitError({ error, recoverable }) {
    this.emit("error", {
      timestamp: Date.now(),
      // TODO(brian): add label
      label: "",
      error,
      recoverable
    });
  }
  *resampleAudio(frame) {
    yield frame;
  }
  createResponse({
    userInitiated,
    instructions,
    oldHandle
  }) {
    const handle = oldHandle || new CreateResponseHandle({ instructions });
    if (oldHandle && instructions) {
      handle.instructions = instructions;
    }
    const eventId = shortuuid("response_create_");
    if (userInitiated) {
      this.responseCreatedFutures[eventId] = handle;
    }
    const response = {};
    if (instructions) response.instructions = instructions;
    if (userInitiated) response.metadata = { client_event_id: eventId };
    this.sendEvent({
      type: "response.create",
      event_id: eventId,
      response: Object.keys(response).length > 0 ? response : void 0
    });
    return handle;
  }
  resolveGeneration(responseId) {
    if (!this.currentGeneration) {
      throw new Error("currentGeneration is not set");
    }
    const generation_ev = {
      messageStream: this.currentGeneration.messageChannel.stream(),
      functionStream: this.currentGeneration.functionChannel.stream(),
      userInitiated: false
    };
    const handle = this.responseCreatedFutures[responseId];
    if (handle) {
      delete this.responseCreatedFutures[responseId];
      generation_ev.userInitiated = true;
      if (handle.doneFut.done) {
        this.#logger.warn({ responseId }, "response received after timeout");
      } else {
        handle.doneFut.resolve(generation_ev);
      }
    }
  }
}
function livekitItemToOpenAIItem(item) {
  switch (item.type) {
    case "function_call":
      return {
        id: item.id,
        type: "function_call",
        call_id: item.callId,
        name: item.name,
        arguments: item.args
      };
    case "function_call_output":
      return {
        id: item.id,
        type: "function_call_output",
        call_id: item.callId,
        output: item.output
      };
    case "message":
      const role = item.role === "developer" ? "system" : item.role;
      const contentList = [];
      for (const c of item.content) {
        if (typeof c === "string") {
          contentList.push({
            type: role === "assistant" ? "text" : "input_text",
            text: c
          });
        } else if (c.type === "image_content") {
          continue;
        } else if (c.type === "audio_content") {
          if (role === "user") {
            const encodedAudio = Buffer.from(combineAudioFrames(c.frame).data).toString("base64");
            contentList.push({
              type: "input_audio",
              audio: encodedAudio
            });
          }
        }
      }
      return {
        id: item.id,
        type: "message",
        role,
        content: contentList
      };
  }
}
function openAIItemToLivekitItem(item) {
  if (!item.id) {
    throw new Error("item.id is not set");
  }
  switch (item.type) {
    case "function_call":
      return llm.FunctionCall.create({
        id: item.id,
        callId: item.call_id,
        name: item.name,
        args: item.arguments
      });
    case "function_call_output":
      return llm.FunctionCallOutput.create({
        id: item.id,
        callId: item.call_id,
        output: item.output,
        isError: false
      });
    case "message":
      const content = [];
      const contents = Array.isArray(item.content) ? item.content : [item.content];
      for (const c of contents) {
        if (c.type === "text" || c.type === "input_text") {
          content.push(c.text);
        }
      }
      return llm.ChatMessage.create({
        id: item.id,
        role: item.role,
        content
      });
  }
}
function createMockAudioItem(durationSeconds = 2) {
  const audioData = Buffer.alloc(durationSeconds * SAMPLE_RATE);
  return llm.ChatMessage.create({
    id: shortuuid(MOCK_AUDIO_ID_PREFIX),
    role: "user",
    content: [
      {
        type: "audio_content",
        frame: [
          new AudioFrame(
            new Int16Array(audioData.buffer),
            SAMPLE_RATE,
            NUM_CHANNELS,
            audioData.length / 2
          )
        ]
      }
    ]
  });
}
function toOaiToolChoice(toolChoice) {
  if (typeof toolChoice === "string") {
    return toolChoice;
  }
  if ((toolChoice == null ? void 0 : toolChoice.type) === "function") {
    return toolChoice.function.name;
  }
  return "auto";
}
export {
  RealtimeModel,
  RealtimeSession
};
//# sourceMappingURL=realtime_model.js.map