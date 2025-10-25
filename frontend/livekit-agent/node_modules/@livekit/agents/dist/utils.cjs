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
var utils_exports = {};
__export(utils_exports, {
  AsyncIterableQueue: () => AsyncIterableQueue,
  AudioEnergyFilter: () => AudioEnergyFilter,
  CancellablePromise: () => CancellablePromise,
  Event: () => Event,
  ExpFilter: () => ExpFilter,
  Future: () => Future,
  InvalidErrorType: () => InvalidErrorType,
  Queue: () => Queue,
  TASK_TIMEOUT_ERROR: () => TASK_TIMEOUT_ERROR,
  Task: () => Task,
  TaskResult: () => TaskResult,
  cancelAndWait: () => cancelAndWait,
  createImmutableArray: () => createImmutableArray,
  delay: () => delay,
  gracefullyCancel: () => gracefullyCancel,
  isImmutableArray: () => isImmutableArray,
  isPending: () => isPending,
  mergeFrames: () => mergeFrames,
  noop: () => noop,
  resampleStream: () => resampleStream,
  shortuuid: () => shortuuid,
  startSoon: () => startSoon,
  toError: () => toError,
  waitFor: () => waitFor,
  waitForAbort: () => waitForAbort,
  waitForParticipant: () => waitForParticipant,
  waitForTrackPublication: () => waitForTrackPublication,
  withResolvers: () => withResolvers
});
module.exports = __toCommonJS(utils_exports);
var import_rtc_node = require("@livekit/rtc-node");
var import_node_events = require("node:events");
var import_web = require("node:stream/web");
var import_uuid = require("uuid");
var import_log = require("./log.cjs");
const noop = () => {
};
const isPending = async (promise) => {
  const sentinel = Symbol("sentinel");
  const result = await Promise.race([promise, Promise.resolve(sentinel)]);
  return result === sentinel;
};
const mergeFrames = (buffer) => {
  if (Array.isArray(buffer)) {
    buffer = buffer;
    if (buffer.length == 0) {
      throw new TypeError("buffer is empty");
    }
    const sampleRate = buffer[0].sampleRate;
    const channels = buffer[0].channels;
    let samplesPerChannel = 0;
    let data = new Int16Array();
    for (const frame of buffer) {
      if (frame.sampleRate !== sampleRate) {
        throw new TypeError("sample rate mismatch");
      }
      if (frame.channels !== channels) {
        throw new TypeError("channel count mismatch");
      }
      data = new Int16Array([...data, ...frame.data]);
      samplesPerChannel += frame.samplesPerChannel;
    }
    return new import_rtc_node.AudioFrame(data, sampleRate, channels, samplesPerChannel);
  }
  return buffer;
};
class Queue {
  /** @internal */
  items = [];
  #limit;
  #events = new import_node_events.EventEmitter();
  constructor(limit) {
    this.#limit = limit;
  }
  async get() {
    const _get = async () => {
      if (this.items.length === 0) {
        await (0, import_node_events.once)(this.#events, "put");
      }
      let item2 = this.items.shift();
      if (!item2) {
        item2 = await _get();
      }
      return item2;
    };
    const item = _get();
    this.#events.emit("get");
    return item;
  }
  async put(item) {
    if (this.#limit && this.items.length >= this.#limit) {
      await (0, import_node_events.once)(this.#events, "get");
    }
    this.items.push(item);
    this.#events.emit("put");
  }
}
class Future {
  #await;
  #resolvePromise;
  #rejectPromise;
  #done = false;
  constructor() {
    this.#await = new Promise((resolve, reject) => {
      this.#resolvePromise = resolve;
      this.#rejectPromise = reject;
    });
  }
  get await() {
    return this.#await;
  }
  get done() {
    return this.#done;
  }
  resolve(value) {
    this.#done = true;
    this.#resolvePromise(value);
  }
  reject(error) {
    this.#done = true;
    this.#rejectPromise(error);
  }
}
class Event {
  #isSet = false;
  #waiters = [];
  async wait() {
    if (this.#isSet) return true;
    let resolve = noop;
    const waiter = new Promise((r) => {
      resolve = r;
      this.#waiters.push(resolve);
    });
    try {
      await waiter;
      return true;
    } finally {
      const index = this.#waiters.indexOf(resolve);
      if (index !== -1) {
        this.#waiters.splice(index, 1);
      }
    }
  }
  get isSet() {
    return this.#isSet;
  }
  set() {
    if (this.#isSet) return;
    this.#isSet = true;
    this.#waiters.forEach((resolve) => resolve());
    this.#waiters = [];
  }
  clear() {
    this.#isSet = false;
  }
}
class CancellablePromise {
  #promise;
  #cancelFn;
  #isCancelled = false;
  #error = null;
  constructor(executor) {
    let cancel;
    this.#promise = new Promise((resolve, reject) => {
      executor(
        resolve,
        (reason) => {
          this.#error = reason instanceof Error ? reason : new Error(String(reason));
          reject(reason);
        },
        (cancelFn) => {
          cancel = () => {
            this.#isCancelled = true;
            cancelFn();
          };
        }
      );
    });
    this.#cancelFn = cancel;
  }
  get isCancelled() {
    return this.#isCancelled;
  }
  get error() {
    return this.#error;
  }
  then(onfulfilled, onrejected) {
    return this.#promise.then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.#promise.catch(onrejected);
  }
  finally(onfinally) {
    return this.#promise.finally(onfinally);
  }
  cancel() {
    this.#cancelFn();
  }
  static from(promise) {
    return new CancellablePromise((resolve, reject) => {
      promise.then(resolve).catch(reject);
    });
  }
}
async function gracefullyCancel(promise) {
  if (!promise.isCancelled) {
    promise.cancel();
  }
  try {
    await promise;
  } catch (error) {
  }
}
class AsyncIterableQueue {
  static CLOSE_SENTINEL = Symbol("CLOSE_SENTINEL");
  #queue = new Queue();
  #closed = false;
  get closed() {
    return this.#closed;
  }
  put(item) {
    if (this.#closed) {
      throw new Error("Queue is closed");
    }
    this.#queue.put(item);
  }
  close() {
    this.#closed = true;
    this.#queue.put(AsyncIterableQueue.CLOSE_SENTINEL);
  }
  async next() {
    if (this.#closed && this.#queue.items.length === 0) {
      return { value: void 0, done: true };
    }
    const item = await this.#queue.get();
    if (item === AsyncIterableQueue.CLOSE_SENTINEL && this.#closed) {
      return { value: void 0, done: true };
    }
    return { value: item, done: false };
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
class ExpFilter {
  #alpha;
  #max;
  #filtered = void 0;
  constructor(alpha, max) {
    this.#alpha = alpha;
    this.#max = max;
  }
  reset(alpha) {
    if (alpha) {
      this.#alpha = alpha;
    }
    this.#filtered = void 0;
  }
  apply(exp, sample) {
    if (this.#filtered) {
      const a = this.#alpha ** exp;
      this.#filtered = a * this.#filtered + (1 - a) * sample;
    } else {
      this.#filtered = sample;
    }
    if (this.#max && this.#filtered > this.#max) {
      this.#filtered = this.#max;
    }
    return this.#filtered;
  }
  get filtered() {
    return this.#filtered;
  }
  set alpha(alpha) {
    this.#alpha = alpha;
  }
}
class AudioEnergyFilter {
  #cooldownSeconds;
  #cooldown;
  constructor(cooldownSeconds = 1) {
    this.#cooldownSeconds = cooldownSeconds;
    this.#cooldown = cooldownSeconds;
  }
  pushFrame(frame) {
    const arr = Float32Array.from(frame.data, (x) => x / 32768);
    const rms = (arr.map((x) => x ** 2).reduce((acc, x) => acc + x) / arr.length) ** 0.5;
    if (rms > 4e-3) {
      this.#cooldown = this.#cooldownSeconds;
      return true;
    }
    const durationSeconds = frame.samplesPerChannel / frame.sampleRate;
    this.#cooldown -= durationSeconds;
    if (this.#cooldown > 0) {
      return true;
    }
    return false;
  }
}
const TASK_TIMEOUT_ERROR = new Error("Task cancellation timed out");
var TaskResult = /* @__PURE__ */ ((TaskResult2) => {
  TaskResult2["Timeout"] = "timeout";
  TaskResult2["Completed"] = "completed";
  TaskResult2["Aborted"] = "aborted";
  return TaskResult2;
})(TaskResult || {});
class Task {
  constructor(fn, controller, name) {
    this.fn = fn;
    this.controller = controller;
    this.name = name;
    this.resultFuture = new Future();
    this.runTask();
  }
  resultFuture;
  #logger = (0, import_log.log)();
  /**
   * Creates a new task from a function.
   *
   * @param fn - The function to run
   * @param controller - The abort controller to use
   * @returns A new task
   */
  static from(fn, controller, name) {
    const abortController = controller ?? new AbortController();
    return new Task(fn, abortController, name);
  }
  async runTask() {
    const run = async () => {
      if (this.name) {
        this.#logger.debug(`Task.runTask: task ${this.name} started`);
      }
      return await this.fn(this.controller);
    };
    return run().then((value) => {
      this.resultFuture.resolve(value);
      return value;
    }).catch((error) => {
      this.resultFuture.reject(error);
    }).finally(() => {
      if (this.name) {
        this.#logger.debug(`Task.runTask: task ${this.name} done`);
      }
    });
  }
  /**
   * Cancels the task.
   */
  cancel() {
    this.controller.abort();
  }
  /**
   * Cancels the task and waits for it to complete.
   *
   * @param timeout - The timeout in milliseconds
   * @returns The result status of the task (timeout, completed, aborted)
   */
  async cancelAndWait(timeout) {
    this.cancel();
    try {
      const promises = [
        this.result.then(() => "completed" /* Completed */).catch((error) => {
          if (error.name === "AbortError") {
            return "aborted" /* Aborted */;
          }
          throw error;
        })
      ];
      if (timeout) {
        promises.push(delay(timeout).then(() => "timeout" /* Timeout */));
      }
      const result = await Promise.race(promises);
      if (result === "timeout" /* Timeout */) {
        throw TASK_TIMEOUT_ERROR;
      }
      return result;
    } catch (error) {
      throw error;
    }
  }
  /**
   * The result of the task.
   */
  get result() {
    return this.resultFuture.await;
  }
  /**
   * Whether the task has completed.
   */
  get done() {
    return this.resultFuture.done;
  }
  addDoneCallback(callback) {
    this.resultFuture.await.finally(callback);
  }
}
async function waitFor(tasks) {
  await Promise.allSettled(tasks.map((task) => task.result));
}
async function cancelAndWait(tasks, timeout) {
  await Promise.allSettled(tasks.map((task) => task.cancelAndWait(timeout)));
}
function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function shortuuid(prefix = "") {
  return `${prefix}${(0, import_uuid.v4)().slice(0, 12)}`;
}
const READONLY_SYMBOL = Symbol("Readonly");
const MUTATION_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin"
];
function createImmutableArray(array, additionalErrorMessage = "") {
  return new Proxy(array, {
    get(target, key) {
      if (key === READONLY_SYMBOL) {
        return true;
      }
      if (typeof key === "string" && MUTATION_METHODS.includes(key)) {
        return function() {
          throw new TypeError(
            `Cannot call ${key}() on a read-only array. ${additionalErrorMessage}`.trim()
          );
        };
      }
      return Reflect.get(target, key);
    },
    set(_, prop) {
      throw new TypeError(
        `Cannot assign to read-only array index "${String(prop)}". ${additionalErrorMessage}`.trim()
      );
    },
    deleteProperty(_, prop) {
      throw new TypeError(
        `Cannot delete read-only array index "${String(prop)}". ${additionalErrorMessage}`.trim()
      );
    },
    defineProperty(_, prop) {
      throw new TypeError(
        `Cannot define property "${String(prop)}" on a read-only array. ${additionalErrorMessage}`.trim()
      );
    },
    setPrototypeOf() {
      throw new TypeError(
        `Cannot change prototype of a read-only array. ${additionalErrorMessage}`.trim()
      );
    }
  });
}
function isImmutableArray(array) {
  return typeof array === "object" && !!array[READONLY_SYMBOL];
}
function resampleStream({
  stream,
  outputRate
}) {
  let resampler = null;
  const transformStream = new import_web.TransformStream({
    transform(chunk, controller) {
      if (!resampler) {
        resampler = new import_rtc_node.AudioResampler(chunk.sampleRate, outputRate);
      }
      for (const frame of resampler.push(chunk)) {
        controller.enqueue(frame);
      }
      for (const frame of resampler.flush()) {
        controller.enqueue(frame);
      }
    }
  });
  return stream.pipeThrough(transformStream);
}
class InvalidErrorType extends Error {
  error;
  constructor(error) {
    super(`Expected error, got ${error} (${typeof error})`);
    this.error = error;
    Error.captureStackTrace(this, InvalidErrorType);
  }
}
function toError(error) {
  if (error instanceof Error) {
    return error;
  }
  throw new InvalidErrorType(error);
}
function startSoon(func) {
  setTimeout(func, 0);
}
function delay(ms, options = {}) {
  const { signal } = options;
  if (signal == null ? void 0 : signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(i);
      reject(signal == null ? void 0 : signal.reason);
    };
    const done = () => {
      signal == null ? void 0 : signal.removeEventListener("abort", abort);
      resolve();
    };
    const i = setTimeout(done, ms);
    signal == null ? void 0 : signal.addEventListener("abort", abort, { once: true });
  });
}
async function waitForParticipant({
  room,
  identity,
  kind
}) {
  if (!room.isConnected) {
    throw new Error("Room is not connected");
  }
  const fut = new Future();
  const kindMatch = (participant) => {
    if (kind === void 0) return true;
    if (Array.isArray(kind)) {
      return kind.includes(participant.kind);
    }
    return participant.kind === kind;
  };
  const onParticipantConnected = (p) => {
    if ((identity === void 0 || p.identity === identity) && kindMatch(p)) {
      if (!fut.done) {
        fut.resolve(p);
      }
    }
  };
  room.on(import_rtc_node.RoomEvent.ParticipantConnected, onParticipantConnected);
  try {
    for (const p of room.remoteParticipants.values()) {
      onParticipantConnected(p);
      if (fut.done) {
        break;
      }
    }
    return await fut.await;
  } finally {
    room.off(import_rtc_node.RoomEvent.ParticipantConnected, onParticipantConnected);
  }
}
async function waitForTrackPublication({
  room,
  identity,
  kind
}) {
  if (!room.isConnected) {
    throw new Error("Room is not connected");
  }
  const fut = new Future();
  const kindMatch = (k) => {
    if (kind === void 0 || kind === null) {
      return true;
    }
    return k === kind;
  };
  const onTrackPublished = (publication, participant) => {
    if (fut.done) return;
    if ((identity === void 0 || participant.identity === identity) && kindMatch(publication.kind)) {
      fut.resolve(publication);
    }
  };
  room.on(import_rtc_node.RoomEvent.TrackPublished, onTrackPublished);
  try {
    for (const p of room.remoteParticipants.values()) {
      for (const publication of p.trackPublications.values()) {
        onTrackPublished(publication, p);
        if (fut.done) break;
      }
    }
    return await fut.await;
  } finally {
    room.off(import_rtc_node.RoomEvent.TrackPublished, onTrackPublished);
  }
}
async function waitForAbort(signal) {
  const abortFuture = new Future();
  const handler = () => {
    abortFuture.resolve();
    signal.removeEventListener("abort", handler);
  };
  signal.addEventListener("abort", handler, { once: true });
  return await abortFuture.await;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AsyncIterableQueue,
  AudioEnergyFilter,
  CancellablePromise,
  Event,
  ExpFilter,
  Future,
  InvalidErrorType,
  Queue,
  TASK_TIMEOUT_ERROR,
  Task,
  TaskResult,
  cancelAndWait,
  createImmutableArray,
  delay,
  gracefullyCancel,
  isImmutableArray,
  isPending,
  mergeFrames,
  noop,
  resampleStream,
  shortuuid,
  startSoon,
  toError,
  waitFor,
  waitForAbort,
  waitForParticipant,
  waitForTrackPublication,
  withResolvers
});
//# sourceMappingURL=utils.cjs.map