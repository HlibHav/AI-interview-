import { MultiMutex, Mutex } from "@livekit/mutex";
import { Queue } from "../utils.js";
import { JobProcExecutor } from "./job_proc_executor.js";
class ProcPool {
  agent;
  initializeTimeout;
  closeTimeout;
  executors = [];
  tasks = [];
  started = false;
  closed = false;
  controller = new AbortController();
  initMutex = new Mutex();
  procMutex;
  procUnlock;
  warmedProcQueue = new Queue();
  inferenceExecutor;
  memoryWarnMB;
  memoryLimitMB;
  constructor(agent, numIdleProcesses, initializeTimeout, closeTimeout, inferenceExecutor, memoryWarnMB, memoryLimitMB) {
    this.agent = agent;
    if (numIdleProcesses > 0) {
      this.procMutex = new MultiMutex(numIdleProcesses);
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
      proc = new JobProcExecutor(
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
    const proc = new JobProcExecutor(
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
export {
  ProcPool
};
//# sourceMappingURL=proc_pool.js.map