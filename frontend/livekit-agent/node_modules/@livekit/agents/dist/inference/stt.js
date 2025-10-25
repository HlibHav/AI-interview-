import {} from "@livekit/rtc-node";
import { WebSocket } from "ws";
import { APIError, APIStatusError } from "../_exceptions.js";
import { AudioByteStream } from "../audio.js";
import { log } from "../log.js";
import {
  STT as BaseSTT,
  SpeechStream as BaseSpeechStream,
  SpeechEventType
} from "../stt/index.js";
import { DEFAULT_API_CONNECT_OPTIONS } from "../types.js";
import { Event, Task, cancelAndWait, shortuuid, waitForAbort } from "../utils.js";
import { connectWs, createAccessToken } from "./utils.js";
const DEFAULT_ENCODING = "pcm_s16le";
const DEFAULT_SAMPLE_RATE = 16e3;
const DEFAULT_BASE_URL = "wss://agent-gateway.livekit.cloud/v1";
const DEFAULT_CANCEL_TIMEOUT = 5e3;
class STT extends BaseSTT {
  opts;
  streams = /* @__PURE__ */ new Set();
  #logger = log();
  constructor(opts) {
    super({ streaming: true, interimResults: true });
    const {
      model,
      language,
      baseURL,
      encoding = DEFAULT_ENCODING,
      sampleRate = DEFAULT_SAMPLE_RATE,
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
    this.opts = {
      model,
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
    return "inference.STT";
  }
  static fromModelString(modelString) {
    if (modelString.includes(":")) {
      const [model, language] = modelString.split(":");
      return new STT({ model, language });
    }
    return new STT({ model: modelString });
  }
  async _recognize(_) {
    throw new Error("LiveKit STT does not support batch recognition, use stream() instead");
  }
  updateOptions(opts) {
    this.opts = { ...this.opts, ...opts };
    for (const stream of this.streams) {
      stream.updateOptions(opts);
    }
  }
  stream(options) {
    const { language, connOptions = DEFAULT_API_CONNECT_OPTIONS } = options || {};
    const streamOpts = {
      ...this.opts,
      language: language ?? this.opts.language
    };
    const stream = new SpeechStream(this, streamOpts, connOptions);
    this.streams.add(stream);
    return stream;
  }
}
class SpeechStream extends BaseSpeechStream {
  opts;
  requestId = shortuuid("stt_request_");
  speaking = false;
  speechDuration = 0;
  reconnectEvent = new Event();
  #logger = log();
  constructor(sttImpl, opts, connOptions) {
    super(sttImpl, opts.sampleRate, connOptions);
    this.opts = opts;
  }
  get label() {
    return "inference.SpeechStream";
  }
  updateOptions(opts) {
    this.opts = { ...this.opts, ...opts };
  }
  async run() {
    let ws = null;
    let closingWs = false;
    this.reconnectEvent.set();
    const connect = async () => {
      const params = {
        settings: {
          sample_rate: String(this.opts.sampleRate),
          encoding: this.opts.encoding,
          extra: this.opts.modelOptions
        }
      };
      if (this.opts.model && this.opts.model !== "auto") {
        params.model = this.opts.model;
      }
      if (this.opts.language) {
        params.settings.language = this.opts.language;
      }
      let baseURL = this.opts.baseURL;
      if (baseURL.startsWith("http://") || baseURL.startsWith("https://")) {
        baseURL = baseURL.replace("http", "ws");
      }
      const token = await createAccessToken(this.opts.apiKey, this.opts.apiSecret);
      const url = `${baseURL}/stt`;
      const headers = { Authorization: `Bearer ${token}` };
      const socket = await connectWs(url, headers, 1e4);
      const msg = { ...params, type: "session.create" };
      socket.send(JSON.stringify(msg));
      return socket;
    };
    const send = async (socket, signal) => {
      const audioStream = new AudioByteStream(
        this.opts.sampleRate,
        1,
        Math.floor(this.opts.sampleRate / 20)
        // 50ms
      );
      for await (const ev of this.input) {
        if (signal.aborted) break;
        let frames;
        if (ev === SpeechStream.FLUSH_SENTINEL) {
          frames = audioStream.flush();
        } else {
          const frame = ev;
          frames = audioStream.write(new Int16Array(frame.data).buffer);
        }
        for (const frame of frames) {
          this.speechDuration += frame.samplesPerChannel / frame.sampleRate;
          const base64 = Buffer.from(frame.data.buffer).toString("base64");
          const msg = { type: "input_audio", audio: base64 };
          socket.send(JSON.stringify(msg));
        }
      }
      closingWs = true;
      socket.send(JSON.stringify({ type: "session.finalize" }));
    };
    const recv = async (socket, signal) => {
      while (!this.closed && !signal.aborted) {
        const dataPromise = new Promise((resolve, reject) => {
          const messageHandler = (d) => {
            resolve(d.toString());
            removeListeners();
          };
          const errorHandler = (e) => {
            reject(e);
            removeListeners();
          };
          const closeHandler = (code) => {
            if (closingWs) {
              resolve("");
            } else {
              reject(
                new APIStatusError({
                  message: "LiveKit STT connection closed unexpectedly",
                  options: { statusCode: code }
                })
              );
            }
            removeListeners();
          };
          const removeListeners = () => {
            socket.removeListener("message", messageHandler);
            socket.removeListener("error", errorHandler);
            socket.removeListener("close", closeHandler);
          };
          socket.once("message", messageHandler);
          socket.once("error", errorHandler);
          socket.once("close", closeHandler);
        });
        const data = await Promise.race([dataPromise, waitForAbort(signal)]);
        if (!data || signal.aborted) return;
        const json = JSON.parse(data);
        const type = json.type;
        switch (type) {
          case "session.created":
          case "session.finalized":
          case "session.closed":
            break;
          case "interim_transcript":
            this.processTranscript(json, false);
            break;
          case "final_transcript":
            this.processTranscript(json, true);
            break;
          case "error":
            this.#logger.error("received error from LiveKit STT: %o", json);
            throw new APIError(`LiveKit STT returned error: ${JSON.stringify(json)}`);
          default:
            this.#logger.warn("received unexpected message from LiveKit STT: %o", json);
            break;
        }
      }
    };
    while (true) {
      try {
        ws = await connect();
        const sendTask = Task.from(async ({ signal }) => {
          await send(ws, signal);
        });
        const recvTask = Task.from(async ({ signal }) => {
          await recv(ws, signal);
        });
        const tasks = [sendTask, recvTask];
        const waitReconnectTask = Task.from(async ({ signal }) => {
          await Promise.race([this.reconnectEvent.wait(), waitForAbort(signal)]);
        });
        try {
          await Promise.race([
            Promise.all(tasks.map((task) => task.result)),
            waitReconnectTask.result
          ]);
          if (!waitReconnectTask.done) break;
          this.reconnectEvent.clear();
        } finally {
          await cancelAndWait([sendTask, recvTask, waitReconnectTask], DEFAULT_CANCEL_TIMEOUT);
        }
      } finally {
        try {
          if (ws) ws.close();
        } catch {
        }
      }
    }
  }
  processTranscript(data, isFinal) {
    const requestId = data.request_id ?? this.requestId;
    const text = data.transcript ?? "";
    const language = data.language ?? this.opts.language ?? "en";
    if (!text && !isFinal) return;
    if (!this.speaking) {
      this.speaking = true;
      this.queue.put({ type: SpeechEventType.START_OF_SPEECH });
    }
    const speechData = {
      language,
      startTime: data.start ?? 0,
      endTime: data.duration ?? 0,
      confidence: data.confidence ?? 1,
      text
    };
    if (isFinal) {
      if (this.speechDuration > 0) {
        this.queue.put({
          type: SpeechEventType.RECOGNITION_USAGE,
          requestId,
          recognitionUsage: { audioDuration: this.speechDuration }
        });
        this.speechDuration = 0;
      }
      this.queue.put({
        type: SpeechEventType.FINAL_TRANSCRIPT,
        requestId,
        alternatives: [speechData]
      });
      if (this.speaking) {
        this.speaking = false;
        this.queue.put({ type: SpeechEventType.END_OF_SPEECH });
      }
    } else {
      this.queue.put({
        type: SpeechEventType.INTERIM_TRANSCRIPT,
        requestId,
        alternatives: [speechData]
      });
    }
  }
}
export {
  STT,
  SpeechStream
};
//# sourceMappingURL=stt.js.map