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
var inference_proc_executor_exports = {};
__export(inference_proc_executor_exports, {
  InferenceProcExecutor: () => InferenceProcExecutor
});
module.exports = __toCommonJS(inference_proc_executor_exports);
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();
var import_node_child_process = require("node:child_process");
var import_log = require("../log.cjs");
var import_utils = require("../utils.cjs");
var import_supervised_proc = require("./supervised_proc.cjs");
class PendingInference {
  promise = new Promise((resolve) => {
    this.resolve = resolve;
  });
  resolve(arg) {
    arg;
  }
}
class InferenceProcExecutor extends import_supervised_proc.SupervisedProc {
  #runners;
  #activeRequests = {};
  #logger = (0, import_log.log)();
  constructor({
    runners,
    initializeTimeout,
    closeTimeout,
    memoryWarnMB,
    memoryLimitMB,
    pingInterval,
    pingTimeout,
    highPingThreshold
  }) {
    super(
      initializeTimeout,
      closeTimeout,
      memoryWarnMB,
      memoryLimitMB,
      pingInterval,
      pingTimeout,
      highPingThreshold
    );
    this.#runners = runners;
  }
  createProcess() {
    return (0, import_node_child_process.fork)(new URL("./inference_proc_lazy_main.js", importMetaUrl), [
      JSON.stringify(this.#runners)
    ]);
  }
  async mainTask(proc) {
    proc.on("message", (msg) => {
      switch (msg.case) {
        case "inferenceResponse":
          const res = this.#activeRequests[msg.value.requestId];
          delete this.#activeRequests[msg.value.requestId];
          if (!res) {
            this.#logger.child({ requestId: msg.value.requestId }).warn("received unexpected inference response");
            return;
          }
          res.resolve(msg.value);
      }
    });
  }
  async doInference(method, data) {
    const requestId = (0, import_utils.shortuuid)("inference_req_");
    const fut = new PendingInference();
    this.proc.send({ case: "inferenceRequest", value: { requestId, method, data } });
    this.#activeRequests[requestId] = fut;
    const res = await fut.promise;
    if (res.error) {
      throw new Error(`inference of ${method} failed: ${res.error}`);
    }
    return res.data;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InferenceProcExecutor
});
//# sourceMappingURL=inference_proc_executor.cjs.map