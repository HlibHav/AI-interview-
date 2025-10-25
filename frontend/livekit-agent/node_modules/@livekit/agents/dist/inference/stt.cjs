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
var stt_exports = {};
__export(stt_exports, {
  STT: () => STT,
  SpeechStream: () => SpeechStream
});
module.exports = __toCommonJS(stt_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_ws = require("ws");
var import_exceptions = require("../_exceptions.cjs");
var import_audio = require("../audio.cjs");
var import_log = require("../log.cjs");
var import_stt = require("../stt/index.cjs");
var import_types = require("../types.cjs");
var import_utils = require("../utils.cjs");
var import_utils2 = require("./utils.cjs");
const DEFAULT_ENCODING = "pcm_s16le";
const DEFAULT_SAMPLE_RATE = 16e3;
const DEFAULT_BASE_URL = "wss://agent-gateway.livekit.cloud/v1";
const DEFAULT_CANCEL_TIMEOUT = 5e3;
class STT extends import_stt.STT {
  opts;
  streams = /* @__PURE__ */ new Set();
  #logger = (0, import_log.log)();
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
    const { language, connOptions = import_types.DEFAULT_API_CONNECT_OPTIONS } = options || {};
    const streamOpts = {
      ...this.opts,
      language: language ?? this.opts.language
    };
    const stream = new SpeechStream(this, streamOpts, connOptions);
    this.streams.add(stream);
    return stream;
  }
}
class SpeechStream extends import_stt.SpeechStream {
  opts;
  requestId = (0, import_utils.shortuuid)("stt_request_");
  speaking = false;
  speechDuration = 0;
  reconnectEvent = new import_utils.Event();
  #logger = (0, import_log.log)();
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
      const token = await (0, import_utils2.createAccessToken)(this.opts.apiKey, this.opts.apiSecret);
      const url = `${baseURL}/stt`;
      const headers = { Authorization: `Bearer ${token}` };
      const socket = await (0, import_utils2.connectWs)(url, headers, 1e4);
      const msg = { ...params, type: "session.create" };
      socket.send(JSON.stringify(msg));
      return socket;
    };
    const send = async (socket, signal) => {
      const audioStream = new import_audio.AudioByteStream(
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
                new import_exceptions.APIStatusError({
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
        const data = await Promise.race([dataPromise, (0, import_utils.waitForAbort)(signal)]);
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
            throw new import_exceptions.APIError(`LiveKit STT returned error: ${JSON.stringify(json)}`);
          default:
            this.#logger.warn("received unexpected message from LiveKit STT: %o", json);
            break;
        }
      }
    };
    while (true) {
      try {
        ws = await connect();
        const sendTask = import_utils.Task.from(async ({ signal }) => {
          await send(ws, signal);
        });
        const recvTask = import_utils.Task.from(async ({ signal }) => {
          await recv(ws, signal);
        });
        const tasks = [sendTask, recvTask];
        const waitReconnectTask = import_utils.Task.from(async ({ signal }) => {
          await Promise.race([this.reconnectEvent.wait(), (0, import_utils.waitForAbort)(signal)]);
        });
        try {
          await Promise.race([
            Promise.all(tasks.map((task) => task.result)),
            waitReconnectTask.result
          ]);
          if (!waitReconnectTask.done) break;
          this.reconnectEvent.clear();
        } finally {
          await (0, import_utils.cancelAndWait)([sendTask, recvTask, waitReconnectTask], DEFAULT_CANCEL_TIMEOUT);
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
      this.queue.put({ type: import_stt.SpeechEventType.START_OF_SPEECH });
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
          type: import_stt.SpeechEventType.RECOGNITION_USAGE,
          requestId,
          recognitionUsage: { audioDuration: this.speechDuration }
        });
        this.speechDuration = 0;
      }
      this.queue.put({
        type: import_stt.SpeechEventType.FINAL_TRANSCRIPT,
        requestId,
        alternatives: [speechData]
      });
      if (this.speaking) {
        this.speaking = false;
        this.queue.put({ type: import_stt.SpeechEventType.END_OF_SPEECH });
      }
    } else {
      this.queue.put({
        type: import_stt.SpeechEventType.INTERIM_TRANSCRIPT,
        requestId,
        alternatives: [speechData]
      });
    }
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STT,
  SpeechStream
});
//# sourceMappingURL=stt.cjs.map