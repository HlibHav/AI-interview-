class AssignmentTimeoutError extends Error {
  constructor(message = "Assignment timeout occurred") {
    super(message);
    this.name = "AssignmentTimeoutError";
    Error.captureStackTrace(this, AssignmentTimeoutError);
  }
}
const API_ERROR_SYMBOL = Symbol("APIError");
class APIError extends Error {
  body;
  retryable;
  constructor(message, { body = null, retryable = true } = {}) {
    super(message);
    this.name = "APIError";
    this.body = body;
    this.retryable = retryable;
    Error.captureStackTrace(this, APIError);
    Object.defineProperty(this, API_ERROR_SYMBOL, {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  toString() {
    return `${this.message} (body=${JSON.stringify(this.body)}, retryable=${this.retryable})`;
  }
}
class APIStatusError extends APIError {
  statusCode;
  requestId;
  constructor({
    message = "API error.",
    options = {}
  }) {
    const statusCode = options.statusCode ?? -1;
    const isRetryable = options.retryable ?? !(statusCode >= 400 && statusCode < 500);
    super(message, { body: options.body, retryable: isRetryable });
    this.name = "APIStatusError";
    this.statusCode = statusCode;
    this.requestId = options.requestId ?? null;
    Error.captureStackTrace(this, APIStatusError);
  }
  toString() {
    return `${this.message} (statusCode=${this.statusCode}, requestId=${this.requestId}, body=${JSON.stringify(this.body)}, retryable=${this.retryable})`;
  }
}
class APIConnectionError extends APIError {
  constructor({
    message = "Connection error.",
    options = {}
  }) {
    super(message, { body: null, retryable: options.retryable ?? true });
    this.name = "APIConnectionError";
    Error.captureStackTrace(this, APIConnectionError);
  }
}
class APITimeoutError extends APIConnectionError {
  constructor({
    message = "Request timed out.",
    options = {}
  }) {
    const retryable = (options == null ? void 0 : options.retryable) ?? true;
    super({ message, options: { retryable } });
    this.name = "APITimeoutError";
    Error.captureStackTrace(this, APITimeoutError);
  }
}
function isAPIError(error) {
  return error !== null && typeof error === "object" && API_ERROR_SYMBOL in error;
}
export {
  APIConnectionError,
  APIError,
  APIStatusError,
  APITimeoutError,
  AssignmentTimeoutError,
  isAPIError
};
//# sourceMappingURL=_exceptions.js.map