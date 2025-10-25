import { EventEmitter } from "node:events";
import { APIConnectionError, APIStatusError } from "../_exceptions.js";
import { log } from "../log.js";
import { DeferredReadableStream } from "../stream/deferred_stream.js";
import { DEFAULT_API_CONNECT_OPTIONS } from "../types.js";
import { AsyncIterableQueue, delay, mergeFrames, startSoon, toError } from "../utils.js";
class TTS extends EventEmitter {
  #capabilities;
  #sampleRate;
  #numChannels;
  constructor(sampleRate, numChannels, capabilities) {
    super();
    this.#capabilities = capabilities;
    this.#sampleRate = sampleRate;
    this.#numChannels = numChannels;
  }
  /** Returns this TTS's capabilities */
  get capabilities() {
    return this.#capabilities;
  }
  /** Returns the sample rate of audio frames returned by this TTS */
  get sampleRate() {
    return this.#sampleRate;
  }
  /** Returns the channel count of audio frames returned by this TTS */
  get numChannels() {
    return this.#numChannels;
  }
}
class SynthesizeStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  static END_OF_STREAM = Symbol("END_OF_STREAM");
  input = new AsyncIterableQueue();
  queue = new AsyncIterableQueue();
  output = new AsyncIterableQueue();
  closed = false;
  #tts;
  #metricsPendingTexts = [];
  #metricsText = "";
  #monitorMetricsTask;
  _connOptions;
  abortController = new AbortController();
  deferredInputStream;
  logger = log();
  constructor(tts, connOptions = DEFAULT_API_CONNECT_OPTIONS) {
    this.#tts = tts;
    this._connOptions = connOptions;
    this.deferredInputStream = new DeferredReadableStream();
    this.pumpInput();
    this.abortController.signal.addEventListener("abort", () => {
      this.deferredInputStream.detachSource();
      this.input.close();
      this.output.close();
      this.closed = true;
    });
    startSoon(() => this.mainTask().then(() => this.queue.close()));
  }
  async mainTask() {
    for (let i = 0; i < this._connOptions.maxRetry + 1; i++) {
      try {
        return await this.run();
      } catch (error) {
        if (error instanceof APIStatusError) {
          const retryInterval = this._connOptions._intervalForRetry(i);
          if (this._connOptions.maxRetry === 0 || !error.retryable) {
            this.emitError({ error, recoverable: false });
            throw error;
          } else if (i === this._connOptions.maxRetry) {
            this.emitError({ error, recoverable: false });
            throw new APIConnectionError({
              message: `failed to generate TTS completion after ${this._connOptions.maxRetry + 1} attempts`,
              options: { retryable: false }
            });
          } else {
            this.emitError({ error, recoverable: true });
            this.logger.warn(
              { tts: this.#tts.label, attempt: i + 1, error },
              `failed to synthesize speech, retrying in  ${retryInterval}s`
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
    this.#tts.emit("error", {
      type: "tts_error",
      timestamp: Date.now(),
      label: this.#tts.label,
      error,
      recoverable
    });
  }
  // TODO(AJS-37) Remove when refactoring TTS to use streams
  async pumpInput() {
    const reader = this.deferredInputStream.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || value === SynthesizeStream.FLUSH_SENTINEL) {
          break;
        }
        this.pushText(value);
      }
      this.endInput();
    } catch (error) {
      this.logger.error(error, "Error reading deferred input stream");
    } finally {
      reader.releaseLock();
      if (!this.#monitorMetricsTask) {
        this.output.close();
      }
    }
  }
  async monitorMetrics() {
    const startTime = process.hrtime.bigint();
    let audioDurationMs = 0;
    let ttfb = BigInt(-1);
    let requestId = "";
    const emit = () => {
      if (this.#metricsPendingTexts.length) {
        const text = this.#metricsPendingTexts.shift();
        const duration = process.hrtime.bigint() - startTime;
        const roundedAudioDurationMs = Math.round(audioDurationMs);
        const metrics = {
          type: "tts_metrics",
          timestamp: Date.now(),
          requestId,
          ttfbMs: ttfb === BigInt(-1) ? -1 : Math.trunc(Number(ttfb / BigInt(1e6))),
          durationMs: Math.trunc(Number(duration / BigInt(1e6))),
          charactersCount: text.length,
          audioDurationMs: roundedAudioDurationMs,
          cancelled: this.abortController.signal.aborted,
          label: this.#tts.label,
          streamed: false
        };
        this.#tts.emit("metrics_collected", metrics);
      }
    };
    for await (const audio of this.queue) {
      if (this.abortController.signal.aborted) {
        break;
      }
      this.output.put(audio);
      if (audio === SynthesizeStream.END_OF_STREAM) continue;
      requestId = audio.requestId;
      if (ttfb === BigInt(-1)) {
        ttfb = process.hrtime.bigint() - startTime;
      }
      audioDurationMs += audio.frame.samplesPerChannel / audio.frame.sampleRate * 1e3;
      if (audio.final) {
        emit();
      }
    }
    if (requestId) {
      emit();
    }
  }
  updateInputStream(text) {
    this.deferredInputStream.setSource(text);
  }
  /** Push a string of text to the TTS */
  /** @deprecated Use `updateInputStream` instead */
  pushText(text) {
    if (!this.#monitorMetricsTask) {
      this.#monitorMetricsTask = this.monitorMetrics();
      this.#monitorMetricsTask.finally(() => this.output.close());
    }
    this.#metricsText += text;
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(text);
  }
  /** Flush the TTS, causing it to process all pending text */
  flush() {
    if (this.#metricsText) {
      this.#metricsPendingTexts.push(this.#metricsText);
      this.#metricsText = "";
    }
    if (this.input.closed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.input.put(SynthesizeStream.FLUSH_SENTINEL);
  }
  /** Mark the input as ended and forbid additional pushes */
  endInput() {
    this.flush();
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
  /** Close both the input and output of the TTS stream */
  close() {
    this.abortController.abort();
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
class ChunkedStream {
  queue = new AsyncIterableQueue();
  output = new AsyncIterableQueue();
  closed = false;
  #text;
  #tts;
  _connOptions;
  logger = log();
  constructor(text, tts, connOptions = DEFAULT_API_CONNECT_OPTIONS) {
    this.#text = text;
    this.#tts = tts;
    this._connOptions = connOptions;
    this.monitorMetrics();
    Promise.resolve().then(() => this.mainTask().then(() => this.queue.close()));
  }
  async mainTask() {
    for (let i = 0; i < this._connOptions.maxRetry + 1; i++) {
      try {
        return await this.run();
      } catch (error) {
        if (error instanceof APIStatusError) {
          const retryInterval = this._connOptions._intervalForRetry(i);
          if (this._connOptions.maxRetry === 0 || !error.retryable) {
            this.emitError({ error, recoverable: false });
            throw error;
          } else if (i === this._connOptions.maxRetry) {
            this.emitError({ error, recoverable: false });
            throw new APIConnectionError({
              message: `failed to generate TTS completion after ${this._connOptions.maxRetry + 1} attempts`,
              options: { retryable: false }
            });
          } else {
            this.emitError({ error, recoverable: true });
            this.logger.warn(
              { tts: this.#tts.label, attempt: i + 1, error },
              `failed to generate TTS completion, retrying in ${retryInterval}s`
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
    this.#tts.emit("error", {
      type: "tts_error",
      timestamp: Date.now(),
      label: this.#tts.label,
      error,
      recoverable
    });
  }
  get inputText() {
    return this.#text;
  }
  async monitorMetrics() {
    const startTime = process.hrtime.bigint();
    let audioDurationMs = 0;
    let ttfb = BigInt(-1);
    let requestId = "";
    for await (const audio of this.queue) {
      this.output.put(audio);
      requestId = audio.requestId;
      if (ttfb === BigInt(-1)) {
        ttfb = process.hrtime.bigint() - startTime;
      }
      audioDurationMs += audio.frame.samplesPerChannel / audio.frame.sampleRate * 1e3;
    }
    this.output.close();
    const duration = process.hrtime.bigint() - startTime;
    const metrics = {
      type: "tts_metrics",
      timestamp: Date.now(),
      requestId,
      ttfbMs: ttfb === BigInt(-1) ? -1 : Math.trunc(Number(ttfb / BigInt(1e6))),
      durationMs: Math.trunc(Number(duration / BigInt(1e6))),
      charactersCount: this.#text.length,
      audioDurationMs: Math.round(audioDurationMs),
      cancelled: false,
      // TODO(AJS-186): support ChunkedStream with 1.0 - add this.abortController.signal.aborted here
      label: this.#tts.label,
      streamed: false
    };
    this.#tts.emit("metrics_collected", metrics);
  }
  /** Collect every frame into one in a single call */
  async collect() {
    const frames = [];
    for await (const event of this) {
      frames.push(event.frame);
    }
    return mergeFrames(frames);
  }
  next() {
    return this.output.next();
  }
  /** Close both the input and output of the TTS stream */
  close() {
    this.queue.close();
    this.output.close();
    this.closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
export {
  ChunkedStream,
  SynthesizeStream,
  TTS
};
//# sourceMappingURL=tts.js.map