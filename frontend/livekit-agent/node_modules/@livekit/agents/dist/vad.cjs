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
var vad_exports = {};
__export(vad_exports, {
  VAD: () => VAD,
  VADEventType: () => VADEventType,
  VADStream: () => VADStream
});
module.exports = __toCommonJS(vad_exports);
var import_node_events = require("node:events");
var import_log = require("./log.cjs");
var import_deferred_stream = require("./stream/deferred_stream.cjs");
var import_identity_transform = require("./stream/identity_transform.cjs");
var VADEventType = /* @__PURE__ */ ((VADEventType2) => {
  VADEventType2[VADEventType2["START_OF_SPEECH"] = 0] = "START_OF_SPEECH";
  VADEventType2[VADEventType2["INFERENCE_DONE"] = 1] = "INFERENCE_DONE";
  VADEventType2[VADEventType2["END_OF_SPEECH"] = 2] = "END_OF_SPEECH";
  VADEventType2[VADEventType2["METRICS_COLLECTED"] = 3] = "METRICS_COLLECTED";
  return VADEventType2;
})(VADEventType || {});
class VAD extends import_node_events.EventEmitter {
  #capabilities;
  constructor(capabilities) {
    super();
    this.#capabilities = capabilities;
  }
  get capabilities() {
    return this.#capabilities;
  }
}
class VADStream {
  static FLUSH_SENTINEL = Symbol("FLUSH_SENTINEL");
  input = new import_identity_transform.IdentityTransform();
  output = new import_identity_transform.IdentityTransform();
  inputWriter;
  inputReader;
  outputWriter;
  outputReader;
  closed = false;
  inputClosed = false;
  #vad;
  #lastActivityTime = BigInt(0);
  logger = (0, import_log.log)();
  deferredInputStream;
  metricsStream;
  constructor(vad) {
    this.#vad = vad;
    this.deferredInputStream = new import_deferred_stream.DeferredReadableStream();
    this.inputWriter = this.input.writable.getWriter();
    this.inputReader = this.input.readable.getReader();
    this.outputWriter = this.output.writable.getWriter();
    const [outputStream, metricsStream] = this.output.readable.tee();
    this.metricsStream = metricsStream;
    this.outputReader = outputStream.getReader();
    this.pumpDeferredStream();
    this.monitorMetrics();
  }
  /**
   * Reads from the deferred input stream and forwards chunks to the input writer.
   *
   * Note: we can't just do this.deferredInputStream.stream.pipeTo(this.input.writable)
   * because the inputWriter locks the this.input.writable stream. All writes must go through
   * the inputWriter.
   */
  async pumpDeferredStream() {
    const reader = this.deferredInputStream.stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await this.inputWriter.write(value);
      }
    } catch (e) {
      this.logger.error(`Error pumping deferred stream: ${e}`);
      throw e;
    } finally {
      reader.releaseLock();
    }
  }
  async monitorMetrics() {
    let inferenceDurationTotalMs = 0;
    let inferenceCount = 0;
    const metricsReader = this.metricsStream.getReader();
    while (true) {
      const { done, value } = await metricsReader.read();
      if (done) {
        break;
      }
      switch (value.type) {
        case 0 /* START_OF_SPEECH */:
          inferenceCount++;
          if (inferenceCount >= 1 / this.#vad.capabilities.updateInterval) {
            this.#vad.emit("metrics_collected", {
              type: "vad_metrics",
              timestamp: Date.now(),
              idleTimeMs: Math.trunc(
                Number((process.hrtime.bigint() - this.#lastActivityTime) / BigInt(1e6))
              ),
              inferenceDurationTotalMs,
              inferenceCount,
              label: this.#vad.label
            });
            inferenceCount = 0;
            inferenceDurationTotalMs = 0;
          }
          break;
        case 1 /* INFERENCE_DONE */:
          inferenceDurationTotalMs += Math.round(value.inferenceDuration);
          this.#lastActivityTime = process.hrtime.bigint();
          break;
        case 2 /* END_OF_SPEECH */:
          this.#lastActivityTime = process.hrtime.bigint();
          break;
      }
    }
  }
  updateInputStream(audioStream) {
    this.deferredInputStream.setSource(audioStream);
  }
  detachInputStream() {
    this.deferredInputStream.detachSource();
  }
  /** @deprecated Use `updateInputStream` instead */
  pushFrame(frame) {
    if (this.inputClosed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.inputWriter.write(frame);
  }
  flush() {
    if (this.inputClosed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.inputWriter.write(VADStream.FLUSH_SENTINEL);
  }
  endInput() {
    if (this.inputClosed) {
      throw new Error("Input is closed");
    }
    if (this.closed) {
      throw new Error("Stream is closed");
    }
    this.inputClosed = true;
    this.input.writable.close();
  }
  async next() {
    return this.outputReader.read().then(({ done, value }) => {
      if (done) {
        return { done: true, value: void 0 };
      }
      return { done: false, value };
    });
  }
  close() {
    this.outputWriter.releaseLock();
    this.outputReader.cancel();
    this.output.writable.close();
    this.closed = true;
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VAD,
  VADEventType,
  VADStream
});
//# sourceMappingURL=vad.cjs.map