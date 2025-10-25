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
  SpeechEventType: () => SpeechEventType,
  SpeechStream: () => SpeechStream
});
module.exports = __toCommonJS(stt_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_node_events = require("node:events");
var import_exceptions = require("../_exceptions.cjs");
var import_audio = require("../audio.cjs");
var import_log = require("../log.cjs");
var import_deferred_stream = require("../stream/deferred_stream.cjs");
var import_types = require("../types.cjs");
var import_utils = require("../utils.cjs");
var SpeechEventType = /* @__PURE__ */ ((SpeechEventType2) => {
  SpeechEventType2[SpeechEventType2["START_OF_SPEECH"] = 0] = "START_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["INTERIM_TRANSCRIPT"] = 1] = "INTERIM_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["FINAL_TRANSCRIPT"] = 2] = "FINAL_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["END_OF_SPEECH"] = 3] = "END_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["RECOGNITION_USAGE"] = 4] = "RECOGNITION_USAGE";
  return SpeechEventType2;
})(SpeechEventType || {});
class STT extends import_node_events.EventEmitter {
  #capabilities;
  constructor(capabilities) {
    super();
    this.#capabilities = capabilities;
  }
  /** Returns this STT's capabilities */
  get capabilities() {
    return this.#capabilities;
  }
  /** Receives an audio buffer and returns transcription in the form of a {@link SpeechEvent} */
  async recognize(frame) {
    const startTime = process.hrtime.bigint();
    const event = await this._recognize(frame);
    const durationMs = Number((process.hrtime.bigint() - startTime) / BigInt(1e6));
    this.emit("metrics_collected", {
      type: "stt_metrics",
      requestId: event.requestId ?? "",
      timestamp: Date.now(),
      durationMs,
      label: this.label,
      audioDurationMs: Math.round((0, import_audio.calculateAudioDurationSeconds)(frame) * 1e3),
      streamed: false
    });
    return event;
  }
}
class SpeechStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new import_utils.AsyncIterableQueue();
  output = new import_utils.AsyncIterableQueue();
  queue = new import_utils.AsyncIterableQueue();
  neededSampleRate;
  resampler;
  closed = false;
  #stt;
  deferredInputStream;
  logger = (0, import_log.log)();
  _connOptions;
  constructor(stt, sampleRate, connectionOptions = import_types.DEFAULT_API_CONNECT_OPTIONS) {
    this.#stt = stt;
    this._connOptions = connectionOptions;
    this.deferredInputStream = new import_deferred_stream.DeferredReadableStream();
    this.neededSampleRate = sampleRate;
    this.monitorMetrics();
    this.pumpInput();
    (0, import_utils.startSoon)(() => this.mainTask().then(() => this.queue.close()));
  }
  async mainTask() {
    for (let i = 0; i < this._connOptions.maxRetry + 1; i++) {
      try {
        return await this.run();
      } catch (error) {
        if (error instanceof import_exceptions.APIError) {
          const retryInterval = this._connOptions._intervalForRetry(i);
          if (this._connOptions.maxRetry === 0 || !error.retryable) {
            this.emitError({ error, recoverable: false });
            throw error;
          } else if (i === this._connOptions.maxRetry) {
            this.emitError({ error, recoverable: false });
            throw new import_exceptions.APIConnectionError({
              message: `failed to recognize speech after ${this._connOptions.maxRetry + 1} attempts`,
              options: { retryable: false }
            });
          } else {
            this.emitError({ error, recoverable: true });
            this.logger.warn(
              { tts: this.#stt.label, attempt: i + 1, error },
              `failed to recognize speech, retrying in ${retryInterval}s`
            );
          }
          if (retryInterval > 0) {
            await (0, import_utils.delay)(retryInterval);
          }
        } else {
          this.emitError({ error: (0, import_utils.toError)(error), recoverable: false });
          throw error;
        }
      }
    }
  }
  emitError({ error, recoverable }) {
    this.#stt.emit("error", {
      type: "stt_error",
      timestamp: Date.now(),
      label: this.#stt.label,
      error,
      recoverable
    });
  }
  async pumpInput() {
    const inputStream = this.deferredInputStream.stream;
    const reader = inputStream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        this.pushFrame(value);
      }
    } catch (error) {
      this.logger.error("Error in STTStream mainTask:", error);
    } finally {
      reader.releaseLock();
    }
  }
  async monitorMetrics() {
    for await (const event of this.queue) {
      this.output.put(event);
      if (event.type !== 4 /* RECOGNITION_USAGE */) continue;
      const metrics = {
        type: "stt_metrics",
        timestamp: Date.now(),
        requestId: event.requestId,
        durationMs: 0,
        label: this.#stt.label,
        audioDurationMs: Math.round(event.recognitionUsage.audioDuration * 1e3),
        streamed: true
      };
      this.#stt.emit("metrics_collected", metrics);
    }
    this.output.close();
  }
  updateInputStream(audioStream) {
    this.deferredInputStream.setSource(audioStream);
  }
  detachInputStream() {
    this.deferredInputStream.detachSource();
  }
  /** Push an audio frame to the STT */
  pushFrame(frame) {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    if (this.neededSampleRate && frame.sampleRate !== this.neededSampleRate) {
      if (!this.resampler) {
        this.resampler = new import_rtc_node.AudioResampler(frame.sampleRate, this.neededSampleRate);
      }
    }
    if (this.resampler) {
      const frames = this.resampler.push(frame);
      for (const frame2 of frames) {
        this.input.put(frame2);
      }
    } else {
      this.input.put(frame);
    }
  }
  /** Flush the STT, causing it to process all pending text */
  flush() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(SpeechStream.FLUSH_SENTINEL);
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.close();
  }
  next() {
    return this.output.next();
  }
  /** Close both the input and output of the STT stream */
  close() {
    this.input.close();
    this.queue.close();
    this.output.close();
    this.closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  STT,
  SpeechEventType,
  SpeechStream
});
//# sourceMappingURL=stt.cjs.map