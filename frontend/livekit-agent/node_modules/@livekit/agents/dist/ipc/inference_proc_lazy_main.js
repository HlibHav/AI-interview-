import { once } from "node:events";
import { initializeLogger, log } from "../log.js";
import { Future } from "../utils.js";
const ORPHANED_TIMEOUT = 15 * 1e3;
(async () => {
  if (process.send) {
    const join = new Future();
    process.on("SIGINT", () => {
      logger.debug("SIGINT received in inference proc");
    });
    process.on("SIGTERM", () => {
      logger.debug("SIGTERM received in inference proc");
    });
    await once(process, "message").then(([msg]) => {
      msg = msg;
      if (msg.case !== "initializeRequest") {
        throw new Error("first message must be InitializeRequest");
      }
      initializeLogger(msg.value.loggerOptions);
    });
    const logger = log().child({ pid: process.pid });
    const runners = await Promise.all(
      Object.entries(JSON.parse(process.argv[2])).map(async ([k, v]) => {
        return [k, await import(v).then((m) => new m.default())];
      })
    ).then(Object.fromEntries);
    await Promise.all(
      Object.entries(runners).map(async ([runner, v]) => {
        logger.child({ runner }).debug("initializing inference runner");
        await v.initialize();
      })
    );
    logger.debug("all inference runners initialized");
    process.send({ case: "initializeResponse" });
    const orphanedTimeout = setTimeout(() => {
      logger.warn("inference process orphaned, shutting down.");
      process.exit();
    }, ORPHANED_TIMEOUT);
    const handleInferenceRequest = async ({
      method,
      requestId,
      data
    }) => {
      if (!runners[method]) {
        logger.child({ method }).warn("unknown inference method");
      }
      try {
        const resp = await runners[method].run(data);
        process.send({ case: "inferenceResponse", value: { requestId, data: resp } });
      } catch (error) {
        process.send({ case: "inferenceResponse", value: { requestId, error } });
      }
    };
    const messageHandler = (msg) => {
      switch (msg.case) {
        case "pingRequest":
          orphanedTimeout.refresh();
          process.send({
            case: "pongResponse",
            value: { lastTimestamp: msg.value.timestamp, timestamp: Date.now() }
          });
          break;
        case "shutdownRequest":
          logger.debug("inference process received shutdown request");
          clearTimeout(orphanedTimeout);
          process.off("message", messageHandler);
          Promise.all(Object.values(runners).map((r) => r.close())).then(() => {
            logger.debug("Inference runners closed");
            process.send({ case: "done" });
            join.resolve();
          }).catch((err) => {
            logger.error("Error closing inference runners:", err);
          });
          break;
        case "inferenceRequest":
          handleInferenceRequest(msg.value);
      }
    };
    process.on("message", messageHandler);
    await join.await;
    logger.debug("Inference process shutdown");
    return process.exitCode;
  }
})();
//# sourceMappingURL=inference_proc_lazy_main.js.map