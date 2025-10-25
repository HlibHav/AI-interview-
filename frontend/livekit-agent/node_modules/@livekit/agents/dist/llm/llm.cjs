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
var llm_exports = {};
__export(llm_exports, {
  LLM: () => LLM,
  LLMStream: () => LLMStream
});
module.exports = __toCommonJS(llm_exports);
var import_node_events = require("node:events");
var import_exceptions = require("../_exceptions.cjs");
var import_log = require("../log.cjs");
var import_utils = require("../utils.cjs");
var import_chat_context = require("./chat_context.cjs");
class LLM extends import_node_events.EventEmitter {
  constructor() {
    super();
  }
  /**
   * Get the model name/identifier for this LLM instance.
   *
   * @returns The model name if available, "unknown" otherwise.
   *
   * @remarks
   * Plugins should override this property to provide their model information.
   */
  get model() {
    return "unknown";
  }
  /**
   * Pre-warm connection to the LLM service
   */
  prewarm() {
  }
  async aclose() {
  }
}
class LLMStream {
  output = new import_utils.AsyncIterableQueue();
  queue = new import_utils.AsyncIterableQueue();
  closed = false;
  abortController = new AbortController();
  _connOptions;
  logger = (0, import_log.log)();
  #llm;
  #chatCtx;
  #toolCtx;
  constructor(llm, {
    chatCtx,
    toolCtx,
    connOptions
  }) {
    this.#llm = llm;
    this.#chatCtx = chatCtx;
    this.#toolCtx = toolCtx;
    this._connOptions = connOptions;
    this.monitorMetrics();
    this.abortController.signal.addEventListener("abort", () => {
      this.output.close();
      this.closed = true;
    });
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
              message: `failed to generate LLM completion after ${this._connOptions.maxRetry + 1} attempts`,
              options: { retryable: false }
            });
          } else {
            this.emitError({ error, recoverable: true });
            this.logger.warn(
              { llm: this.#llm.label(), attempt: i + 1, error },
              `failed to generate LLM completion, retrying in ${retryInterval}s`
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
    this.#llm.emit("error", {
      type: "llm_error",
      timestamp: Date.now(),
      label: this.#llm.label(),
      error,
      recoverable
    });
  }
  async monitorMetrics() {
    const startTime = process.hrtime.bigint();
    let ttft = BigInt(-1);
    let requestId = "";
    let usage;
    for await (const ev of this.queue) {
      if (this.abortController.signal.aborted) {
        break;
      }
      this.output.put(ev);
      requestId = ev.id;
      if (ttft === BigInt(-1)) {
        ttft = process.hrtime.bigint() - startTime;
      }
      if (ev.usage) {
        usage = ev.usage;
      }
    }
    this.output.close();
    const duration = process.hrtime.bigint() - startTime;
    const durationMs = Math.trunc(Number(duration / BigInt(1e6)));
    const metrics = {
      type: "llm_metrics",
      timestamp: Date.now(),
      requestId,
      ttftMs: ttft === BigInt(-1) ? -1 : Math.trunc(Number(ttft / BigInt(1e6))),
      durationMs,
      cancelled: this.abortController.signal.aborted,
      label: this.#llm.label(),
      completionTokens: (usage == null ? void 0 : usage.completionTokens) || 0,
      promptTokens: (usage == null ? void 0 : usage.promptTokens) || 0,
      promptCachedTokens: (usage == null ? void 0 : usage.promptCachedTokens) || 0,
      totalTokens: (usage == null ? void 0 : usage.totalTokens) || 0,
      tokensPerSecond: (() => {
        if (durationMs <= 0) {
          return 0;
        }
        return ((usage == null ? void 0 : usage.completionTokens) || 0) / (durationMs / 1e3);
      })()
    };
    this.#llm.emit("metrics_collected", metrics);
  }
  /** The function context of this stream. */
  get toolCtx() {
    return this.#toolCtx;
  }
  /** The initial chat context of this stream. */
  get chatCtx() {
    return this.#chatCtx;
  }
  /** The connection options for this stream. */
  get connOptions() {
    return this._connOptions;
  }
  next() {
    return this.output.next();
  }
  close() {
    this.abortController.abort();
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  LLM,
  LLMStream
});
//# sourceMappingURL=llm.cjs.map