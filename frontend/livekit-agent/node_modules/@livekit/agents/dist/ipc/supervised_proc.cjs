"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var supervised_proc_exports = {};
__export(supervised_proc_exports, {
  SupervisedProc: () => SupervisedProc
});
module.exports = __toCommonJS(supervised_proc_exports);
var import_node_events = require("node:events");
var import_pidusage = __toESM(require("pidusage"), 1);
var import_log = require("../log.cjs");
var import_utils = require("../utils.cjs");
class SupervisedProc {
  #opts;
  #started = false;
  #closing = false;
  #runningJob = void 0;
  proc;
  #pingInterval;
  #memoryMonitorInterval;
  #pongTimeout;
  init = new import_utils.Future();
  #join = new import_utils.Future();
  #logger = (0, import_log.log)().child({ runningJob: this.#runningJob });
  constructor(initializeTimeout, closeTimeout, memoryWarnMB, memoryLimitMB, pingInterval, pingTimeout, highPingThreshold) {
    this.#opts = {
      initializeTimeout,
      closeTimeout,
      memoryWarnMB,
      memoryLimitMB,
      pingInterval,
      pingTimeout,
      highPingThreshold
    };
  }
  get started() {
    return this.#started;
  }
  get runningJob() {
    return this.#runningJob;
  }
  async start() {
    if (this.#started) {
      throw new Error("runner already started");
    } else if (this.#closing) {
      throw new Error("runner is closed");
    }
    this.proc = this.createProcess();
    this.#started = true;
    this.run();
  }
  async run() {
    await this.init.await;
    this.#pingInterval = setInterval(() => {
      this.proc.send({ case: "pingRequest", value: { timestamp: Date.now() } });
    }, this.#opts.pingInterval);
    this.#pongTimeout = setTimeout(() => {
      this.#logger.warn("job is unresponsive");
      clearTimeout(this.#pongTimeout);
      clearInterval(this.#pingInterval);
      this.proc.kill();
      this.#join.resolve();
    }, this.#opts.pingTimeout);
    this.#memoryMonitorInterval = setInterval(async () => {
      const memoryMB = await this.getChildMemoryUsageMB();
      if (this.#opts.memoryLimitMB > 0 && memoryMB > this.#opts.memoryLimitMB) {
        this.#logger.child({ memoryUsageMB: memoryMB, memoryLimitMB: this.#opts.memoryLimitMB }).error("process exceeded memory limit, killing process");
        this.close();
      } else if (this.#opts.memoryWarnMB > 0 && memoryMB > this.#opts.memoryWarnMB) {
        this.#logger.child({
          memoryUsageMB: memoryMB,
          memoryWarnMB: this.#opts.memoryWarnMB,
          memoryLimitMB: this.#opts.memoryLimitMB
        }).warn("process memory usage is high");
      }
    }, 5e3);
    const listener = (msg) => {
      var _a;
      switch (msg.case) {
        case "pongResponse": {
          const delay = Date.now() - msg.value.timestamp;
          if (delay > this.#opts.highPingThreshold) {
            this.#logger.child({ delay }).warn("job executor is unresponsive");
          }
          (_a = this.#pongTimeout) == null ? void 0 : _a.refresh();
          break;
        }
        case "exiting": {
          this.#logger.child({ reason: msg.value.reason }).debug("job exiting");
          break;
        }
        case "done": {
          this.#closing = true;
          this.proc.off("message", listener);
          break;
        }
      }
    };
    this.proc.on("message", listener);
    this.proc.on("error", (err) => {
      if (this.#closing) return;
      this.#logger.child({ err }).warn("job process exited unexpectedly; this likely means the error above caused a crash");
      this.clearTimers();
      this.#join.resolve();
    });
    this.proc.on("exit", () => {
      this.#join.resolve();
    });
    this.mainTask(this.proc);
    await this.#join.await;
  }
  async join() {
    if (!this.#started) {
      throw new Error("runner not started");
    }
    await this.#join.await;
  }
  async initialize() {
    const timer = setTimeout(() => {
      const err = new Error("runner initialization timed out");
      this.init.reject(err);
      throw err;
    }, this.#opts.initializeTimeout);
    this.proc.send({
      case: "initializeRequest",
      value: {
        loggerOptions: import_log.loggerOptions,
        pingInterval: this.#opts.pingInterval,
        pingTimeout: this.#opts.pingTimeout,
        highPingThreshold: this.#opts.highPingThreshold
      }
    });
    await (0, import_node_events.once)(this.proc, "message").then(([msg]) => {
      clearTimeout(timer);
      if (msg.case !== "initializeResponse") {
        throw new Error("first message must be InitializeResponse");
      }
    });
    this.init.resolve();
  }
  async close() {
    if (!this.#started) {
      return;
    }
    this.#closing = true;
    this.proc.send({ case: "shutdownRequest" });
    const timer = setTimeout(() => {
      this.#logger.error("job shutdown is taking too much time");
      this.proc.kill();
    }, this.#opts.closeTimeout);
    await this.#join.await.then(() => {
      clearTimeout(timer);
      this.clearTimers();
    });
  }
  async launchJob(info) {
    if (this.#runningJob) {
      throw new Error("executor already has a running job");
    }
    this.#runningJob = info;
    this.proc.send({ case: "startJobRequest", value: { runningJob: info } });
  }
  async getChildMemoryUsageMB() {
    var _a;
    const pid = (_a = this.proc) == null ? void 0 : _a.pid;
    if (!pid) {
      return 0;
    }
    const stats = await (0, import_pidusage.default)(pid);
    return stats.memory / (1024 * 1024);
  }
  clearTimers() {
    clearTimeout(this.#pongTimeout);
    clearInterval(this.#pingInterval);
    clearInterval(this.#memoryMonitorInterval);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SupervisedProc
});
//# sourceMappingURL=supervised_proc.cjs.map