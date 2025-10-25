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
var proc_pool_exports = {};
__export(proc_pool_exports, {
  ProcPool: () => ProcPool
});
module.exports = __toCommonJS(proc_pool_exports);
var import_mutex = require("@livekit/mutex");
var import_utils = require("../utils.cjs");
var import_job_proc_executor = require("./job_proc_executor.cjs");
class ProcPool {
  agent;
  initializeTimeout;
  closeTimeout;
  executors = [];
  tasks = [];
  started = false;
  closed = false;
  controller = new AbortController();
  initMutex = new import_mutex.Mutex();
  procMutex;
  procUnlock;
  warmedProcQueue = new import_utils.Queue();
  inferenceExecutor;
  memoryWarnMB;
  memoryLimitMB;
  constructor(agent, numIdleProcesses, initializeTimeout, closeTimeout, inferenceExecutor, memoryWarnMB, memoryLimitMB) {
    this.agent = agent;
    if (numIdleProcesses > 0) {
      this.procMutex = new import_mutex.MultiMutex(numIdleProcesses);
    }
    this.initializeTimeout = initializeTimeout;
    this.closeTimeout = closeTimeout;
    this.inferenceExecutor = inferenceExecutor;
    this.memoryWarnMB = memoryWarnMB;
    this.memoryLimitMB = memoryLimitMB;
  }
  get processes() {
    return this.executors;
  }
  getByJobId(id) {
    return this.executors.find((x) => x.runningJob && x.runningJob.job.id === id) || null;
  }
  async launchJob(info) {
    let proc;
    if (this.procMutex) {
      proc = await this.warmedProcQueue.get();
      if (this.procUnlock) {
        this.procUnlock();
        this.procUnlock = void 0;
      }
    } else {
      proc = new import_job_proc_executor.JobProcExecutor(
        this.agent,
        this.inferenceExecutor,
        this.initializeTimeout,
        this.closeTimeout,
        this.memoryWarnMB,
        this.memoryLimitMB,
        2500,
        6e4,
        500
      );
      this.executors.push(proc);
      await proc.start();
      await proc.initialize();
    }
    await proc.launchJob(info);
  }
  async procWatchTask() {
    const proc = new import_job_proc_executor.JobProcExecutor(
      this.agent,
      this.inferenceExecutor,
      this.initializeTimeout,
      this.closeTimeout,
      this.memoryWarnMB,
      this.memoryLimitMB,
      2500,
      6e4,
      500
    );
    try {
      this.executors.push(proc);
      const unlock = await this.initMutex.lock();
      if (this.closed) {
        return;
      }
      await proc.start();
      try {
        await proc.initialize();
        await this.warmedProcQueue.put(proc);
      } catch {
        if (this.procUnlock) {
          this.procUnlock();
          this.procUnlock = void 0;
        }
      }
      unlock();
      await proc.join();
    } finally {
      const procIndex = this.executors.indexOf(proc);
      if (procIndex !== -1) {
        this.executors.splice(procIndex, 1);
      } else {
        throw new Error(`proc ${proc} not found in executors`);
      }
    }
  }
  start() {
    if (this.started) {
      return;
    }
    this.started = true;
    this.run(this.controller.signal);
  }
  async run(signal) {
    if (this.procMutex) {
      while (!signal.aborted) {
        this.procUnlock = await this.procMutex.lock();
        const task = this.procWatchTask();
        this.tasks.push(task);
        task.finally(() => {
          const taskIndex = this.tasks.indexOf(task);
          if (taskIndex !== -1) {
            this.tasks.splice(taskIndex, 1);
          } else {
            throw new Error(`task ${task} not found in tasks`);
          }
        });
      }
    }
  }
  async close() {
    if (!this.started) {
      return;
    }
    this.closed = true;
    this.controller.abort();
    this.warmedProcQueue.items.forEach((e) => e.close());
    this.executors.forEach((e) => e.close());
    await Promise.allSettled(this.tasks);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ProcPool
});
//# sourceMappingURL=proc_pool.cjs.map