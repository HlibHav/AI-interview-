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
var tts_exports = {};
__export(tts_exports, {
  SynthesizeStream: () => SynthesizeStream,
  TTS: () => TTS
});
module.exports = __toCommonJS(tts_exports);
var import_ws = require("ws");
var import_exceptions = require("../_exceptions.cjs");
var import_audio = require("../audio.cjs");
var import_log = require("../log.cjs");
var import_stream_channel = require("../stream/stream_channel.cjs");
var import_tokenize = require("../tokenize/index.cjs");
var import_tts = require("../tts/index.cjs");
var import_types = require("../types.cjs");
var import_utils = require("../utils.cjs");
var import_api_protos = require("./api_protos.cjs");
var import_utils2 = require("./utils.cjs");
const DEFAULT_ENCODING = "pcm_s16le";
const DEFAULT_SAMPLE_RATE = 16e3;
const DEFAULT_BASE_URL = "https://agent-gateway.livekit.cloud/v1";
const NUM_CHANNELS = 1;
const DEFAULT_LANGUAGE = "en";
class TTS extends import_tts.TTS {
  opts;
  streams = /* @__PURE__ */ new Set();
  #logger = (0, import_log.log)();
  constructor(opts) {
    const sampleRate = (opts == null ? void 0 : opts.sampleRate) ?? DEFAULT_SAMPLE_RATE;
    super(sampleRate, 1, { streaming: true });
    const {
      model,
      voice,
      language = DEFAULT_LANGUAGE,
      baseURL,
      encoding = DEFAULT_ENCODING,
      apiKey,
      apiSecret,
      modelOptions = {}
    } = opts || {};
    const lkBaseURL = baseURL || process.env.LIVEKIT_INFERENCE_URL || DEFAULT_BASE_URL;
    const lkApiKey = apiKey || process.env.LIVEKIT_INFERENCE_API_KEY || process.env.LIVEKIT_API_KEY;
    if (!lkApiKey) {
      throw new Error("apiKey is required: pass apiKey or set LIVEKIT_API_KEY");
    }
    const lkApiSecret = apiSecret || process.env.LIVEKIT_INFERENCE_API_SECRET || process.env.LIVEKIT_API_SECRET;
    if (!lkApiSecret) {
      throw new Error("apiSecret is required: pass apiSecret or set LIVEKIT_API_SECRET");
    }
    let nextModel = model;
    let nextVoice = voice;
    if (typeof nextModel === "string") {
      const idx = nextModel.lastIndexOf(":");
      if (idx !== -1) {
        const voiceFromModel = nextModel.slice(idx + 1);
        if (nextVoice && nextVoice !== voiceFromModel) {
          this.#logger.warn(
            "`voice` is provided via both argument and model, using the one from the argument",
            { voice: nextVoice, model: nextModel }
          );
        } else {
          nextVoice = voiceFromModel;
        }
        nextModel = nextModel.slice(0, idx);
      }
    }
    this.opts = {
      model: nextModel,
      voice: nextVoice,
      language,
      encoding,
      sampleRate,
      baseURL: lkBaseURL,
      apiKey: lkApiKey,
      apiSecret: lkApiSecret,
      modelOptions
    };
  }
  get label() {
    return "inference.TTS";
  }
  static fromModelString(modelString) {
    if (modelString.includes(":")) {
      const [model, voice] = modelString.split(":");
      return new TTS({ model, voice });
    }
    return new TTS({ model: modelString });
  }
  updateOptions(opts) {
    this.opts = { ...this.opts, ...opts };
    for (const stream of this.streams) {
      stream.updateOptions(opts);
    }
  }
  synthesize(_) {
    throw new Error("ChunkedStream is not implemented");
  }
  stream(options) {
    const { connOptions = import_types.DEFAULT_API_CONNECT_OPTIONS } = options || {};
    const stream = new SynthesizeStream(this, { ...this.opts }, connOptions);
    this.streams.add(stream);
    return stream;
  }
  async connectWs(timeout) {
    let baseURL = this.opts.baseURL;
    if (baseURL.startsWith("http://") || baseURL.startsWith("https://")) {
      baseURL = baseURL.replace("http", "ws");
    }
    const token = await (0, import_utils2.createAccessToken)(this.opts.apiKey, this.opts.apiSecret);
    const url = `${baseURL}/tts`;
    const headers = { Authorization: `Bearer ${token}` };
    const params = {
      type: "session.create",
      sample_rate: String(this.opts.sampleRate),
      encoding: this.opts.encoding,
      extra: this.opts.modelOptions
    };
    if (this.opts.voice) params.voice = this.opts.voice;
    if (this.opts.model) params.model = this.opts.model;
    if (this.opts.language) params.language = this.opts.language;
    const socket = await (0, import_utils2.connectWs)(url, headers, timeout);
    socket.send(JSON.stringify(params));
    return socket;
  }
  async closeWs(ws) {
    await ws.close();
  }
  async close() {
    for (const stream of this.streams) {
      await stream.close();
    }
    this.streams.clear();
  }
}
class SynthesizeStream extends import_tts.SynthesizeStream {
  opts;
  tts;
  connOptions;
  #logger = (0, import_log.log)();
  constructor(tts, opts, connOptions) {
    super(tts, connOptions);
    this.opts = opts;
    this.tts = tts;
    this.connOptions = connOptions;
  }
  get label() {
    return "inference.SynthesizeStream";
  }
  updateOptions(opts) {
    this.opts = { ...this.opts, ...opts };
  }
  async run() {
    let ws = null;
    let closing = false;
    let finalReceived = false;
    let lastFrame;
    const sendTokenizerStream = new import_tokenize.basic.SentenceTokenizer().stream();
    const eventChannel = (0, import_stream_channel.createStreamChannel)();
    const requestId = (0, import_utils.shortuuid)("tts_request_");
    const resourceCleanup = () => {
      if (closing) return;
      closing = true;
      sendTokenizerStream.close();
      eventChannel.close();
      ws == null ? void 0 : ws.removeAllListeners();
      ws == null ? void 0 : ws.close();
    };
    const sendClientEvent = async (event) => {
      const validatedEvent = await import_api_protos.ttsClientEventSchema.parseAsync(event);
      if (!ws || ws.readyState !== import_ws.WebSocket.OPEN) {
        this.#logger.warn("Trying to send client TTS event to a closed WebSocket");
        return;
      }
      ws.send(JSON.stringify(validatedEvent));
    };
    const sendLastFrame = (segmentId, final) => {
      if (lastFrame) {
        this.queue.put({ requestId, segmentId, frame: lastFrame, final });
        lastFrame = void 0;
      }
    };
    const createInputTask = async () => {
      for await (const data of this.input) {
        if (this.abortController.signal.aborted) break;
        if (data === SynthesizeStream.FLUSH_SENTINEL) {
          sendTokenizerStream.flush();
          continue;
        }
        sendTokenizerStream.pushText(data);
      }
      sendTokenizerStream.endInput();
    };
    const createSentenceStreamTask = async () => {
      for await (const ev of sendTokenizerStream) {
        if (this.abortController.signal.aborted) break;
        sendClientEvent({
          type: "input_transcript",
          transcript: ev.token + " "
        });
      }
      sendClientEvent({ type: "session.flush" });
    };
    const createWsListenerTask = async (ws2) => {
      return new Promise((resolve, reject) => {
        this.abortController.signal.addEventListener("abort", () => {
          resourceCleanup();
          reject(new Error("WebSocket connection aborted"));
        });
        ws2.on("message", async (data) => {
          const eventJson = JSON.parse(data.toString());
          const validatedEvent = import_api_protos.ttsServerEventSchema.parse(eventJson);
          eventChannel.write(validatedEvent);
        });
        ws2.on("error", (e) => {
          this.#logger.error({ error: e }, "WebSocket error");
          resourceCleanup();
          reject(e);
        });
        ws2.on("close", () => {
          resourceCleanup();
          if (!closing) return this.#logger.error("WebSocket closed unexpectedly");
          if (finalReceived) return resolve();
          reject(
            new import_exceptions.APIStatusError({
              message: "Gateway connection closed unexpectedly",
              options: { requestId }
            })
          );
        });
      });
    };
    const createRecvTask = async () => {
      let currentSessionId = null;
      const bstream = new import_audio.AudioByteStream(this.opts.sampleRate, NUM_CHANNELS);
      const serverEventStream = eventChannel.stream();
      const reader = serverEventStream.getReader();
      try {
        while (!this.closed && !this.abortController.signal.aborted) {
          const result = await reader.read();
          if (this.abortController.signal.aborted) return;
          if (result.done) return;
          const serverEvent = result.value;
          switch (serverEvent.type) {
            case "session.created":
              currentSessionId = serverEvent.session_id;
              break;
            case "output_audio":
              const base64Data = new Int8Array(Buffer.from(serverEvent.audio, "base64"));
              for (const frame of bstream.write(base64Data.buffer)) {
                sendLastFrame(currentSessionId, false);
                lastFrame = frame;
              }
              break;
            case "done":
              finalReceived = true;
              for (const frame of bstream.flush()) {
                sendLastFrame(currentSessionId, false);
                lastFrame = frame;
              }
              sendLastFrame(currentSessionId, true);
              this.queue.put(SynthesizeStream.END_OF_STREAM);
              break;
            case "session.closed":
              resourceCleanup();
              break;
            case "error":
              this.#logger.error(
                { serverEvent },
                "Received error message from LiveKit TTS WebSocket"
              );
              resourceCleanup();
              throw new import_exceptions.APIError(`LiveKit TTS returned error: ${serverEvent.message}`);
            default:
              this.#logger.warn("Unexpected message %s", serverEvent);
              break;
          }
        }
      } finally {
        reader.releaseLock();
        try {
          await serverEventStream.cancel();
        } catch (e) {
          this.#logger.debug("Error cancelling serverEventStream (may already be cancelled):", e);
        }
      }
    };
    try {
      ws = await this.tts.connectWs(this.connOptions.timeoutMs);
      await Promise.all([
        createInputTask(),
        createSentenceStreamTask(),
        createWsListenerTask(ws),
        createRecvTask()
      ]);
    } catch (e) {
      this.#logger.error("Error in SynthesizeStream", { error: e });
    } finally {
      resourceCleanup();
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SynthesizeStream,
  TTS
});
//# sourceMappingURL=tts.cjs.map