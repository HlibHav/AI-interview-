"use strict";
var import_rtc_node = require("@livekit/rtc-node");
var import_node_events = require("node:events");
var import_node_url = require("node:url");
var import_generator = require("../generator.cjs");
var import_job = require("../job.cjs");
var import_log = require("../log.cjs");
var import_utils = require("../utils.cjs");
var import_worker = require("../worker.cjs");
const ORPHANED_TIMEOUT = 15 * 1e3;
class PendingInference {
  promise = new Promise((resolve) => {
    this.resolve = resolve;
  });
  resolve(arg) {
    arg;
  }
}
class InfClient {
  #requests = {};
  constructor() {
    process.on("message", (msg) => {
      switch (msg.case) {
        case "inferenceResponse":
          const fut = this.#requests[msg.value.requestId];
          delete this.#requests[msg.value.requestId];
          if (!fut) {
            (0, import_log.log)().child({ resp: msg.value }).warn("received unexpected inference response");
            return;
          }
          fut.resolve(msg.value);
          break;
      }
    });
  }
  async doInference(method, data) {
    const requestId = (0, import_utils.shortuuid)("inference_job_");
    process.send({ case: "inferenceRequest", value: { requestId, method, data } });
    this.#requests[requestId] = new PendingInference();
    const resp = await this.#requests[requestId].promise;
    if (resp.error) {
      throw new Error(`inference of ${method} failed: ${resp.error.message}`);
    }
    return resp.data;
  }
}
const startJob = (proc, func, info, closeEvent, logger, joinFuture) => {
  let connect = false;
  let shutdown = false;
  const room = new import_rtc_node.Room();
  room.on(import_rtc_node.RoomEvent.Disconnected, () => {
    if (!shutdown) {
      closeEvent.emit("close", false);
    }
  });
  const onConnect = () => {
    connect = true;
  };
  const onShutdown = (reason) => {
    shutdown = true;
    closeEvent.emit("close", true, reason);
  };
  const ctx = new import_job.JobContext(proc, info, room, onConnect, onShutdown, new InfClient());
  const task = new Promise(async () => {
    const unconnectedTimeout = setTimeout(() => {
      if (!(connect || shutdown)) {
        logger.warn(
          "room not connect after job_entry was called after 10 seconds, ",
          "did you forget to call ctx.connect()?"
        );
      }
    }, 1e4);
    await (0, import_job.runWithJobContextAsync)(ctx, () => func(ctx)).finally(() => {
      clearTimeout(unconnectedTimeout);
    });
    await (0, import_node_events.once)(closeEvent, "close").then((close) => {
      logger.debug("shutting down");
      shutdown = true;
      process.send({ case: "exiting", value: { reason: close[1] } });
    });
    await room.disconnect();
    logger.debug("disconnected from room");
    const shutdownTasks = [];
    for (const callback of ctx.shutdownCallbacks) {
      shutdownTasks.push(callback());
    }
    await Promise.all(shutdownTasks).catch(
      (error) => logger.error("error while shutting down the job", error)
    );
    process.send({ case: "done" });
    joinFuture.resolve();
  });
  return { ctx, task };
};
(async () => {
  if (process.send) {
    const join = new import_utils.Future();
    const moduleFile = process.argv[2];
    const agent = await import((0, import_node_url.pathToFileURL)(moduleFile).pathname).then((module2) => {
      const agent2 = module2.default;
      if (agent2 === void 0 || !(0, import_generator.isAgent)(agent2)) {
        throw new Error(`Unable to load agent: Missing or invalid default export in ${moduleFile}`);
      }
      return agent2;
    });
    if (!agent.prewarm) {
      agent.prewarm = import_worker.defaultInitializeProcessFunc;
    }
    process.on("SIGINT", () => {
      logger.debug("SIGINT received in job proc");
    });
    process.on("SIGTERM", () => {
      logger.debug("SIGTERM received in job proc");
    });
    await (0, import_node_events.once)(process, "message").then(([msg]) => {
      msg = msg;
      if (msg.case !== "initializeRequest") {
        throw new Error("first message must be InitializeRequest");
      }
      (0, import_log.initializeLogger)(msg.value.loggerOptions);
    });
    const proc = new import_job.JobProcess();
    let logger = (0, import_log.log)().child({ pid: proc.pid });
    process.on("unhandledRejection", (reason) => {
      logger.error(reason);
    });
    logger.debug("initializing job runner");
    agent.prewarm(proc);
    logger.debug("job runner initialized");
    process.send({ case: "initializeResponse" });
    let job = void 0;
    const closeEvent = new import_node_events.EventEmitter();
    const orphanedTimeout = setTimeout(() => {
      logger.warn("job process orphaned, shutting down.");
      join.resolve();
    }, ORPHANED_TIMEOUT);
    const messageHandler = (msg) => {
      switch (msg.case) {
        case "pingRequest": {
          orphanedTimeout.refresh();
          process.send({
            case: "pongResponse",
            value: { lastTimestamp: msg.value.timestamp, timestamp: Date.now() }
          });
          break;
        }
        case "startJobRequest": {
          if (job) {
            throw new Error("job task already running");
          }
          logger = logger.child({ jobID: msg.value.runningJob.job.id });
          job = startJob(proc, agent.entry, msg.value.runningJob, closeEvent, logger, join);
          logger.debug("job started");
          break;
        }
        case "shutdownRequest": {
          if (!job) {
            join.resolve();
          }
          closeEvent.emit("close", "shutdownRequest");
          clearTimeout(orphanedTimeout);
          process.off("message", messageHandler);
        }
      }
    };
    process.on("message", messageHandler);
    await join.await;
    logger.debug("Job process shutdown");
    process.exit(0);
  }
})();
//# sourceMappingURL=job_proc_lazy_main.cjs.map