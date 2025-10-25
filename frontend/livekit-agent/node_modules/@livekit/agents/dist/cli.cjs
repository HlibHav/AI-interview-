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
var cli_exports = {};
__export(cli_exports, {
  runApp: () => runApp
});
module.exports = __toCommonJS(cli_exports);
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.src || new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();
var import_commander = require("commander");
var import_log = require("./log.cjs");
var import_plugin = require("./plugin.cjs");
var import_version = require("./version.cjs");
var import_worker = require("./worker.cjs");
const runWorker = async (args) => {
  (0, import_log.initializeLogger)({ pretty: !args.production, level: args.opts.logLevel });
  const logger = (0, import_log.log)();
  const { production: _, ...opts } = args.opts;
  const worker = new import_worker.Worker(new import_worker.WorkerOptions({ production: args.production, ...opts }));
  if (args.room) {
    worker.event.once("worker_registered", () => {
      logger.info(`connecting to room ${args.room}`);
      worker.simulateJob(args.room, args.participantIdentity);
    });
  }
  process.once("SIGINT", async () => {
    logger.debug("SIGINT received in CLI");
    process.once("SIGINT", () => {
      console.log("Force exit (Ctrl+C pressed twice)");
      process.exit(130);
    });
    if (args.production) {
      await worker.drain();
    }
    await worker.close();
    logger.debug("worker closed due to SIGINT.");
    process.exit(130);
  });
  process.once("SIGTERM", async () => {
    logger.debug("SIGTERM received in CLI.");
    if (args.production) {
      await worker.drain();
    }
    await worker.close();
    logger.debug("worker closed due to SIGTERM.");
    process.exit(143);
  });
  try {
    await worker.run();
  } catch {
    logger.fatal("closing worker due to error.");
    process.exit(1);
  }
};
const runApp = (opts) => {
  const program = new import_commander.Command().name("agents").description("LiveKit Agents CLI").version(import_version.version).addOption(
    new import_commander.Option("--log-level <level>", "Set the logging level").choices(["trace", "debug", "info", "warn", "error", "fatal"]).default("info").env("LOG_LEVEL")
  ).addOption(
    new import_commander.Option("--url <string>", "LiveKit server or Cloud project websocket URL").env(
      "LIVEKIT_URL"
    )
  ).addOption(
    new import_commander.Option("--api-key <string>", "LiveKit server or Cloud project's API key").env(
      "LIVEKIT_API_KEY"
    )
  ).addOption(
    new import_commander.Option("--api-secret <string>", "LiveKit server or Cloud project's API secret").env(
      "LIVEKIT_API_SECRET"
    )
  ).addOption(
    new import_commander.Option("--worker-token <string>", "Internal use only").env("LIVEKIT_WORKER_TOKEN").hideHelp()
  ).action(() => {
    if (
      // do not run CLI if origin file is agents/ipc/job_main.js
      process.argv[1] !== new URL("ipc/job_main.js", importMetaUrl).pathname && process.argv.length < 3
    ) {
      program.help();
    }
  });
  program.command("start").description("Start the worker in production mode").action(() => {
    const options = program.optsWithGlobals();
    opts.wsURL = options.url || opts.wsURL;
    opts.apiKey = options.apiKey || opts.apiKey;
    opts.apiSecret = options.apiSecret || opts.apiSecret;
    opts.logLevel = options.logLevel || opts.logLevel;
    opts.workerToken = options.workerToken || opts.workerToken;
    runWorker({
      opts,
      production: true,
      watch: false
    });
  });
  program.command("dev").description("Start the worker in development mode").addOption(
    new import_commander.Option("--log-level <level>", "Set the logging level").choices(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug").env("LOG_LEVEL")
  ).action(() => {
    const options = program.optsWithGlobals();
    opts.wsURL = options.url || opts.wsURL;
    opts.apiKey = options.apiKey || opts.apiKey;
    opts.apiSecret = options.apiSecret || opts.apiSecret;
    opts.logLevel = options.logLevel || opts.logLevel;
    opts.workerToken = options.workerToken || opts.workerToken;
    runWorker({
      opts,
      production: false,
      watch: false
    });
  });
  program.command("connect").description("Connect to a specific room").requiredOption("--room <string>", "Room name to connect to").option("--participant-identity <string>", "Identity of user to listen to").addOption(
    new import_commander.Option("--log-level <level>", "Set the logging level").choices(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug").env("LOG_LEVEL")
  ).action((...[, command]) => {
    const options = command.optsWithGlobals();
    opts.wsURL = options.url || opts.wsURL;
    opts.apiKey = options.apiKey || opts.apiKey;
    opts.apiSecret = options.apiSecret || opts.apiSecret;
    opts.logLevel = options.logLevel || opts.logLevel;
    opts.workerToken = options.workerToken || opts.workerToken;
    runWorker({
      opts,
      production: false,
      watch: false,
      room: options.room,
      participantIdentity: options.participantIdentity
    });
  });
  program.command("download-files").description("Download plugin dependency files").addOption(
    new import_commander.Option("--log-level <level>", "Set the logging level").choices(["trace", "debug", "info", "warn", "error", "fatal"]).default("debug").env("LOG_LEVEL")
  ).action(() => {
    const options = program.optsWithGlobals();
    (0, import_log.initializeLogger)({ pretty: true, level: options.logLevel });
    const logger = (0, import_log.log)();
    const downloadFiles = async () => {
      for (const plugin of import_plugin.Plugin.registeredPlugins) {
        logger.info(`Downloading files for ${plugin.title}`);
        try {
          await plugin.downloadFiles();
          logger.info(`Finished downloading files for ${plugin.title}`);
        } catch (error) {
          logger.error(`Failed to download files for ${plugin.title}: ${error}`);
        }
      }
    };
    downloadFiles().catch((error) => {
      logger.fatal(`Error during file downloads: ${error}`);
      process.exit(1);
    }).finally(() => {
      process.exit(0);
    });
  });
  program.parse();
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runApp
});
//# sourceMappingURL=cli.cjs.map