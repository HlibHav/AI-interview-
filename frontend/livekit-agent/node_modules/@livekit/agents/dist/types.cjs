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
var types_exports = {};
__export(types_exports, {
  APIConnectOptions: () => APIConnectOptions,
  DEFAULT_API_CONNECT_OPTIONS: () => DEFAULT_API_CONNECT_OPTIONS
});
module.exports = __toCommonJS(types_exports);
class APIConnectOptions {
  /** Maximum number of retries to connect to the API. */
  maxRetry;
  /** Interval between retries to connect to the API in milliseconds. */
  retryIntervalMs;
  /** Timeout for connecting to the API in milliseconds. */
  timeoutMs;
  constructor(options = {}) {
    this.maxRetry = options.maxRetry ?? 3;
    this.retryIntervalMs = options.retryIntervalMs ?? 2e3;
    this.timeoutMs = options.timeoutMs ?? 1e4;
    if (this.maxRetry < 0) {
      throw new Error("maxRetry must be greater than or equal to 0");
    }
    if (this.retryIntervalMs < 0) {
      throw new Error("retryIntervalMs must be greater than or equal to 0");
    }
    if (this.timeoutMs < 0) {
      throw new Error("timeoutMs must be greater than or equal to 0");
    }
  }
  /** @internal */
  _intervalForRetry(numRetries) {
    if (numRetries === 0) {
      return 0.1;
    }
    return this.retryIntervalMs;
  }
}
const DEFAULT_API_CONNECT_OPTIONS = new APIConnectOptions();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  APIConnectOptions,
  DEFAULT_API_CONNECT_OPTIONS
});
//# sourceMappingURL=types.cjs.map