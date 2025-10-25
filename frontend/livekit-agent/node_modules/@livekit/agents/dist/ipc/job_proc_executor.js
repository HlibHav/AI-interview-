import { fork } from "node:child_process";
import { log } from "../log.js";
import { JobStatus } from "./job_executor.js";
import { SupervisedProc } from "./supervised_proc.js";
class JobProcExecutor extends SupervisedProc {
  #userArgs;
  // eslint-disable-line @typescript-eslint/no-explicit-any
  #jobStatus;
  #runningJob;
  #agent;
  #inferenceExecutor;
  #inferenceTasks = [];
  #logger = log();
  constructor(agent, inferenceExecutor, initializeTimeout, closeTimeout, memoryWarnMB, memoryLimitMB, pingInterval, pingTimeout, highPingThreshold) {
    super(
      initializeTimeout,
      closeTimeout,
      memoryWarnMB,
      memoryLimitMB,
      pingInterval,
      pingTimeout,
      highPingThreshold
    );
    this.#agent = agent;
    this.#inferenceExecutor = inferenceExecutor;
  }
  get status() {
    if (this.#jobStatus) {
      return this.#jobStatus;
    }
    throw new Error("job status not available");
  }
  get userArguments() {
    return this.#userArgs;
  }
  set userArguments(args) {
    this.#userArgs = args;
  }
  get runningJob() {
    return this.#runningJob;
  }
  createProcess() {
    return fork(new URL("./job_proc_lazy_main.js", import.meta.url), [this.#agent]);
  }
  async mainTask(proc) {
    proc.on("message", (msg) => {
      switch (msg.case) {
        case "inferenceRequest":
          this.#inferenceTasks.push(this.#doInferenceTask(proc, msg.value));
      }
    });
  }
  async #doInferenceTask(proc, req) {
    if (!this.#inferenceExecutor) {
      this.#logger.warn("inference request received but no inference executor");
      proc.send({
        case: "inferenceResponse",
        value: { requestId: req.requestId, error: new Error("no inference executor") }
      });
      return;
    }
    try {
      const data = await this.#inferenceExecutor.doInference(req.method, req.data);
      proc.send({ case: "inferenceResponse", value: { requestId: req.requestId, data } });
    } catch (error) {
      proc.send({ case: "inferenceResponse", value: { requestId: req.requestId, error } });
    }
  }
  async launchJob(info) {
    if (this.#runningJob) {
      throw Error("process already has a running job");
    }
    if (!this.init.done) {
      throw Error("process not initialized");
    }
    this.#jobStatus = JobStatus.RUNNING;
    this.#runningJob = info;
    this.proc.send({ case: "startJobRequest", value: { runningJob: info } });
  }
}
export {
  JobProcExecutor
};
//# sourceMappingURL=job_proc_executor.js.map