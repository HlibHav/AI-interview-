import { WebSocket } from "ws";
import { APIError, APIStatusError } from "../_exceptions.js";
import { AudioByteStream } from "../audio.js";
import { log } from "../log.js";
import { createStreamChannel } from "../stream/stream_channel.js";
import { basic as tokenizeBasic } from "../tokenize/index.js";
import {
  SynthesizeStream as BaseSynthesizeStream,
  TTS as BaseTTS,
  ChunkedStream
} from "../tts/index.js";
import { DEFAULT_API_CONNECT_OPTIONS } from "../types.js";
import { shortuuid } from "../utils.js";
import {
  ttsClientEventSchema,
  ttsServerEventSchema
} from "./api_protos.js";
import { connectWs, createAccessToken } from "./utils.js";
const DEFAULT_ENCODING = "pcm_s16le";
const DEFAULT_SAMPLE_RATE = 16e3;
const DEFAULT_BASE_URL = "https://agent-gateway.livekit.cloud/v1";
const NUM_CHANNELS = 1;
const DEFAULT_LANGUAGE = "en";
class TTS extends BaseTTS {
  opts;
  streams = /* @__PURE__ */ new Set();
  #logger = log();
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
    const { connOptions = DEFAULT_API_CONNECT_OPTIONS } = options || {};
    const stream = new SynthesizeStream(this, { ...this.opts }, connOptions);
    this.streams.add(stream);
    return stream;
  }
  async connectWs(timeout) {
    let baseURL = this.opts.baseURL;
    if (baseURL.startsWith("http://") || baseURL.startsWith("https://")) {
      baseURL = baseURL.replace("http", "ws");
    }
    const token = await createAccessToken(this.opts.apiKey, this.opts.apiSecret);
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
    const socket = await connectWs(url, headers, timeout);
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
class SynthesizeStream extends BaseSynthesizeStream {
  opts;
  tts;
  connOptions;
  #logger = log();
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
    const sendTokenizerStream = new tokenizeBasic.SentenceTokenizer().stream();
    const eventChannel = createStreamChannel();
    const requestId = shortuuid("tts_request_");
    const resourceCleanup = () => {
      if (closing) return;
      closing = true;
      sendTokenizerStream.close();
      eventChannel.close();
      ws == null ? void 0 : ws.removeAllListeners();
      ws == null ? void 0 : ws.close();
    };
    const sendClientEvent = async (event) => {
      const validatedEvent = await ttsClientEventSchema.parseAsync(event);
      if (!ws || ws.readyState !== WebSocket.OPEN) {
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
          const validatedEvent = ttsServerEventSchema.parse(eventJson);
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
            new APIStatusError({
              message: "Gateway connection closed unexpectedly",
              options: { requestId }
            })
          );
        });
      });
    };
    const createRecvTask = async () => {
      let currentSessionId = null;
      const bstream = new AudioByteStream(this.opts.sampleRate, NUM_CHANNELS);
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
              throw new APIError(`LiveKit TTS returned error: ${serverEvent.message}`);
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
export {
  SynthesizeStream,
  TTS
};
//# sourceMappingURL=tts.js.map