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
var job_proc_executor_exports = {};
__export(job_proc_executor_exports, {
  JobProcExecutor: () => JobProcExecutor
});
module.exports = __toCommonJS(job_proc_executor_exports);
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();
var import_node_child_process = require("node:child_process");
var import_log = require("../log.cjs");
var import_job_executor = require("./job_executor.cjs");
var import_supervised_proc = require("./supervised_proc.cjs");
class JobProcExecutor extends import_supervised_proc.SupervisedProc {
  #userArgs;
  // eslint-disable-line @typescript-eslint/no-explicit-any
  #jobStatus;
  #runningJob;
  #agent;
  #inferenceExecutor;
  #inferenceTasks = [];
  #logger = (0, import_log.log)();
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
    return (0, import_node_child_process.fork)(new URL("./job_proc_lazy_main.js", importMetaUrl), [this.#agent]);
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
    this.#jobStatus = import_job_executor.JobStatus.RUNNING;
    this.#runningJob = info;
    this.proc.send({ case: "startJobRequest", value: { runningJob: info } });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JobProcExecutor
});
//# sourceMappingURL=job_proc_executor.cjs.map