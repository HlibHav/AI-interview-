import { AudioResampler } from "@livekit/rtc-node";
import { EventEmitter } from "node:events";
import { APIConnectionError, APIError } from "../_exceptions.js";
import { calculateAudioDurationSeconds } from "../audio.js";
import { log } from "../log.js";
import { DeferredReadableStream } from "../stream/deferred_stream.js";
import { DEFAULT_API_CONNECT_OPTIONS } from "../types.js";
import { AsyncIterableQueue, delay, startSoon, toError } from "../utils.js";
var SpeechEventType = /* @__PURE__ */ ((SpeechEventType2) => {
  SpeechEventType2[SpeechEventType2["START_OF_SPEECH"] = 0] = "START_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["INTERIM_TRANSCRIPT"] = 1] = "INTERIM_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["FINAL_TRANSCRIPT"] = 2] = "FINAL_TRANSCRIPT";
  SpeechEventType2[SpeechEventType2["END_OF_SPEECH"] = 3] = "END_OF_SPEECH";
  SpeechEventType2[SpeechEventType2["RECOGNITION_USAGE"] = 4] = "RECOGNITION_USAGE";
  return SpeechEventType2;
})(SpeechEventType || {});
class STT extends EventEmitter {
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
      audioDurationMs: Math.round(calculateAudioDurationSeconds(frame) * 1e3),
      streamed: false
    });
    return event;
  }
}
class SpeechStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new AsyncIterableQueue();
  output = new AsyncIterableQueue();
  queue = new AsyncIterableQueue();
  neededSampleRate;
  resampler;
  closed = false;
  #stt;
  deferredInputStream;
  logger = log();
  _connOptions;
  constructor(stt, sampleRate, connectionOptions = DEFAULT_API_CONNECT_OPTIONS) {
    this.#stt = stt;
    this._connOptions = connectionOptions;
    this.deferredInputStream = new DeferredReadableStream();
    this.neededSampleRate = sampleRate;
    this.monitorMetrics();
    this.pumpInput();
    startSoon(() => this.mainTask().then(() => this.queue.close()));
  }
  async mainTask() {
    for (let i = 0; i < this._connOptions.maxRetry + 1; i++) {
      try {
        return await this.run();
      } catch (error) {
        if (error instanceof APIError) {
          const retryInterval = this._connOptions._intervalForRetry(i);
          if (this._connOptions.maxRetry === 0 || !error.retryable) {
            this.emitError({ error, recoverable: false });
            throw error;
          } else if (i === this._connOptions.maxRetry) {
            this.emitError({ error, recoverable: false });
            throw new APIConnectionError({
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
            await delay(retryInterval);
          }
        } else {
          this.emitError({ error: toError(error), recoverable: false });
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
        this.resampler = new AudioResampler(frame.sampleRate, this.neededSampleRate);
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
export {
  STT,
  SpeechEventType,
  SpeechStream
};
//# sourceMappingURL=stt.js.map