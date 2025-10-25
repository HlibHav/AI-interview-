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
export {
  APIConnectOptions,
  DEFAULT_API_CONNECT_OPTIONS
};
//# sourceMappingURL=types.js.map