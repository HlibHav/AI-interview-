import { fork } from "node:child_process";
import { log } from "../log.js";
import { shortuuid } from "../utils.js";
import { SupervisedProc } from "./supervised_proc.js";
class PendingInference {
  promise = new Promise((resolve) => {
    this.resolve = resolve;
  });
  resolve(arg) {
    arg;
  }
}
class InferenceProcExecutor extends SupervisedProc {
  #runners;
  #activeRequests = {};
  #logger = log();
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
    return fork(new URL("./inference_proc_lazy_main.js", import.meta.url), [
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
    const requestId = shortuuid("inference_req_");
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
export {
  InferenceProcExecutor
};
//# sourceMappingURL=inference_proc_executor.js.map