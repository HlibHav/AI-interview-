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
var worker_exports = {};
__export(worker_exports, {
  MissingCredentialsError: () => MissingCredentialsError,
  Worker: () => Worker,
  WorkerError: () => WorkerError,
  WorkerOptions: () => WorkerOptions,
  WorkerPermissions: () => WorkerPermissions,
  defaultInitializeProcessFunc: () => defaultInitializeProcessFunc
});
module.exports = __toCommonJS(worker_exports);
var import_protocol = require("@livekit/protocol");
var import_livekit_server_sdk = require("livekit-server-sdk");
var import_node_events = require("node:events");
var import_node_os = __toESM(require("node:os"), 1);
var import_ws = require("ws");
var import_http_server = require("./http_server.cjs");
var import_inference_runner = require("./inference_runner.cjs");
var import_inference_proc_executor = require("./ipc/inference_proc_executor.cjs");
var import_proc_pool = require("./ipc/proc_pool.cjs");
var import_job = require("./job.cjs");
var import_log = require("./log.cjs");
var import_utils = require("./utils.cjs");
var import_version = require("./version.cjs");
const MAX_RECONNECT_ATTEMPTS = 10;
const ASSIGNMENT_TIMEOUT = 7.5 * 1e3;
const UPDATE_LOAD_INTERVAL = 2.5 * 1e3;
const PROJECT_TYPE = "nodejs";
class Default {
  static loadThreshold(production) {
    if (production) {
      return 0.7;
    } else {
      return Infinity;
    }
  }
  static numIdleProcesses(production) {
    if (production) {
      return 3;
    } else {
      return 0;
    }
  }
  static port(production) {
    if (production) {
      return 8081;
    } else {
      return 0;
    }
  }
}
class MissingCredentialsError extends Error {
  constructor(msg) {
    super(msg);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class WorkerError extends Error {
  constructor(msg) {
    super(msg);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
const defaultInitializeProcessFunc = (_) => _;
const defaultRequestFunc = async (ctx) => {
  await ctx.accept();
};
const defaultCpuLoad = async (worker) => {
  return new Promise((resolve) => {
    const cpus1 = import_node_os.default.cpus();
    setTimeout(() => {
      const cpus2 = import_node_os.default.cpus();
      let idle = 0;
      let total = 0;
      for (let i = 0; i < cpus1.length; i++) {
        const cpu1 = cpus1[i].times;
        const cpu2 = cpus2[i].times;
        idle += cpu2.idle - cpu1.idle;
        const total1 = Object.values(cpu1).reduce((acc, i2) => acc + i2, 0);
        const total2 = Object.values(cpu2).reduce((acc, i2) => acc + i2, 0);
        total += total2 - total1;
      }
      resolve(+(1 - idle / total).toFixed(2));
    }, UPDATE_LOAD_INTERVAL);
  });
};
class WorkerPermissions {
  canPublish;
  canSubscribe;
  canPublishData;
  canUpdateMetadata;
  canPublishSources;
  hidden;
  constructor(canPublish = true, canSubscribe = true, canPublishData = true, canUpdateMetadata = true, canPublishSources = [], hidden = false) {
    this.canPublish = canPublish;
    this.canSubscribe = canSubscribe;
    this.canPublishData = canPublishData;
    this.canUpdateMetadata = canUpdateMetadata;
    this.canPublishSources = canPublishSources;
    this.hidden = hidden;
  }
}
class WorkerOptions {
  agent;
  requestFunc;
  loadFunc;
  loadThreshold;
  numIdleProcesses;
  shutdownProcessTimeout;
  initializeProcessTimeout;
  permissions;
  agentName;
  workerType;
  maxRetry;
  wsURL;
  apiKey;
  apiSecret;
  workerToken;
  host;
  port;
  logLevel;
  production;
  jobMemoryWarnMB;
  jobMemoryLimitMB;
  /** @param options - Worker options */
  constructor({
    agent,
    requestFunc = defaultRequestFunc,
    loadFunc = defaultCpuLoad,
    loadThreshold = void 0,
    numIdleProcesses = void 0,
    shutdownProcessTimeout = 60 * 1e3,
    initializeProcessTimeout = 10 * 1e3,
    permissions = new WorkerPermissions(),
    agentName = "",
    workerType = import_protocol.JobType.JT_ROOM,
    maxRetry = MAX_RECONNECT_ATTEMPTS,
    wsURL = "ws://localhost:7880",
    apiKey = void 0,
    apiSecret = void 0,
    workerToken = void 0,
    host = "0.0.0.0",
    port = void 0,
    logLevel = "info",
    production = false,
    jobMemoryWarnMB = 500,
    jobMemoryLimitMB = 0
  }) {
    this.agent = agent;
    if (!this.agent) {
      throw new Error("No Agent file was passed to the worker");
    }
    this.requestFunc = requestFunc;
    this.loadFunc = loadFunc;
    this.loadThreshold = loadThreshold || Default.loadThreshold(production);
    this.numIdleProcesses = numIdleProcesses || Default.numIdleProcesses(production);
    this.shutdownProcessTimeout = shutdownProcessTimeout;
    this.initializeProcessTimeout = initializeProcessTimeout;
    this.permissions = permissions;
    this.agentName = agentName;
    this.workerType = workerType;
    this.maxRetry = maxRetry;
    this.wsURL = wsURL;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.workerToken = workerToken;
    this.host = host;
    this.port = port || Default.port(production);
    this.logLevel = logLevel;
    this.production = production;
    this.jobMemoryWarnMB = jobMemoryWarnMB;
    this.jobMemoryLimitMB = jobMemoryLimitMB;
  }
}
class PendingAssignment {
  promise = new Promise((resolve) => {
    this.resolve = resolve;
  });
  resolve(arg) {
    arg;
  }
}
class Worker {
  #opts;
  #procPool;
  #id = "unregistered";
  #closed = true;
  #draining = false;
  #connecting = false;
  #tasks = [];
  #pending = {};
  #close = new import_utils.Future();
  event = new import_node_events.EventEmitter();
  #session = void 0;
  #httpServer;
  #logger = (0, import_log.log)().child({ version: import_version.version });
  #inferenceExecutor;
  /** @throws {@link MissingCredentialsError} if URL, API key or API secret are missing */
  constructor(opts) {
    opts.wsURL = opts.wsURL || process.env.LIVEKIT_URL || "";
    opts.apiKey = opts.apiKey || process.env.LIVEKIT_API_KEY || "";
    opts.apiSecret = opts.apiSecret || process.env.LIVEKIT_API_SECRET || "";
    if (opts.wsURL === "")
      throw new MissingCredentialsError(
        "URL is required: Set LIVEKIT_URL, run with --url, or pass wsURL in WorkerOptions"
      );
    if (opts.apiKey === "")
      throw new MissingCredentialsError(
        "API Key is required: Set LIVEKIT_API_KEY, run with --api-key, or pass apiKey in WorkerOptions"
      );
    if (opts.apiSecret === "")
      throw new MissingCredentialsError(
        "API Secret is required: Set LIVEKIT_API_SECRET, run with --api-secret, or pass apiSecret in WorkerOptions"
      );
    if (opts.workerToken) {
      if (opts.loadFunc !== defaultCpuLoad) {
        this.#logger.warn(
          "custom loadFunc is not supported when deploying to Cloud, using defaults"
        );
        opts.loadFunc = defaultCpuLoad;
      }
      const loadThreshold = Default.loadThreshold(opts.production);
      if (opts.loadThreshold !== loadThreshold) {
        this.#logger.warn(
          "custom loadThreshold is not supported when deploying to Cloud, using defaults"
        );
        opts.loadThreshold = loadThreshold;
      }
    }
    if (Object.entries(import_inference_runner.InferenceRunner.registeredRunners).length) {
      this.#inferenceExecutor = new import_inference_proc_executor.InferenceProcExecutor({
        runners: import_inference_runner.InferenceRunner.registeredRunners,
        initializeTimeout: 3e4,
        closeTimeout: 5e3,
        memoryWarnMB: 2e3,
        memoryLimitMB: 0,
        pingInterval: 5e3,
        pingTimeout: 6e4,
        highPingThreshold: 2500
      });
    }
    this.#procPool = new import_proc_pool.ProcPool(
      opts.agent,
      opts.numIdleProcesses,
      opts.initializeProcessTimeout,
      opts.shutdownProcessTimeout,
      this.#inferenceExecutor,
      opts.jobMemoryWarnMB,
      opts.jobMemoryLimitMB
    );
    this.#opts = opts;
    this.#httpServer = new import_http_server.HTTPServer(opts.host, opts.port, () => ({
      agent_name: opts.agentName,
      worker_type: import_protocol.JobType[opts.workerType],
      active_jobs: this.activeJobs.length,
      sdk_version: import_version.version,
      project_type: PROJECT_TYPE
    }));
  }
  /** @throws {@link WorkerError} if worker failed to connect or already running */
  async run() {
    if (!this.#closed) {
      throw new WorkerError("worker is already running");
    }
    if (this.#inferenceExecutor) {
      await this.#inferenceExecutor.start();
      await this.#inferenceExecutor.initialize();
    }
    this.#logger.info("starting worker");
    this.#closed = false;
    this.#procPool.start();
    const workerWS = async () => {
      let retries = 0;
      this.#connecting = true;
      while (!this.#closed) {
        const url = new URL(this.#opts.wsURL);
        url.protocol = url.protocol.replace("http", "ws");
        const token = new import_livekit_server_sdk.AccessToken(this.#opts.apiKey, this.#opts.apiSecret);
        token.addGrant({ agent: true });
        const jwt = await token.toJwt();
        const wsUrl = new URL(url + "agent");
        if (this.#opts.workerToken) {
          wsUrl.searchParams.append("worker_token", this.#opts.workerToken);
        }
        this.#session = new import_ws.WebSocket(wsUrl, {
          headers: { authorization: "Bearer " + jwt }
        });
        try {
          await new Promise((resolve, reject) => {
            this.#session.on("open", resolve);
            this.#session.on("error", (error) => reject(error.message));
            this.#session.on("close", (code) => reject(`WebSocket returned ${code}`));
          });
          retries = 0;
          this.#logger.debug("connected to LiveKit server");
          await this.#runWS(this.#session);
        } catch (e) {
          if (e instanceof Error || e instanceof ErrorEvent) {
            e = e.message;
          }
          if (this.#closed) return;
          if (retries >= this.#opts.maxRetry) {
            throw new WorkerError(
              `failed to connect to LiveKit server after ${retries} attempts: ${e}`
            );
          }
          retries++;
          const delay = Math.min(retries * 2, 10);
          this.#logger.warn(
            `failed to connect to LiveKit server, retrying in ${delay} seconds: ${e} (${retries}/${this.#opts.maxRetry})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay * 1e3));
        }
      }
    };
    await Promise.all([workerWS(), this.#httpServer.run()]);
    this.#close.resolve();
  }
  get id() {
    return this.#id;
  }
  get activeJobs() {
    return this.#procPool.processes.filter((proc) => proc.runningJob).map((proc) => proc.runningJob);
  }
  /** @throws {@link WorkerError} if worker did not drain in time */
  async drain(timeout) {
    if (this.#draining) {
      return;
    }
    this.#logger.debug("draining worker");
    this.#draining = true;
    this.event.emit(
      "worker_msg",
      new import_protocol.WorkerMessage({
        message: {
          case: "updateWorker",
          value: {
            status: import_protocol.WorkerStatus.WS_FULL
          }
        }
      })
    );
    const joinJobs = async () => {
      return Promise.all(
        this.#procPool.processes.map((proc) => {
          if (!proc.runningJob) {
            proc.close();
          }
          return proc.join();
        })
      );
    };
    let timer;
    if (timeout) {
      timer = setTimeout(() => {
        throw new WorkerError("timed out draining");
      }, timeout);
    }
    await joinJobs().then(() => {
      if (timeout) {
        clearTimeout(timer);
      }
    });
  }
  async simulateJob(roomName, participantIdentity) {
    const client = new import_livekit_server_sdk.RoomServiceClient(this.#opts.wsURL, this.#opts.apiKey, this.#opts.apiSecret);
    const room = await client.createRoom({ name: roomName });
    let participant = void 0;
    if (participantIdentity) {
      try {
        participant = await client.getParticipant(
          roomName,
          participantIdentity
        );
      } catch (e) {
        this.#logger.fatal(
          `participant with identity ${participantIdentity} not found in room ${roomName}`
        );
        throw e;
      }
    }
    this.event.emit(
      "worker_msg",
      new import_protocol.WorkerMessage({
        message: {
          case: "simulateJob",
          value: {
            type: import_protocol.JobType.JT_PUBLISHER,
            room,
            participant
          }
        }
      })
    );
  }
  async #runWS(ws) {
    let closingWS = false;
    const send = (msg) => {
      if (closingWS) {
        this.event.off("worker_msg", send);
        return;
      }
      ws.send(msg.toBinary());
    };
    this.event.on("worker_msg", send);
    const close = new Promise((resolve) => {
      ws.addEventListener("close", () => {
        closingWS = true;
        if (!this.#closed) {
          this.#logger.error("worker connection closed unexpectedly");
        }
        resolve();
      });
    });
    ws.addEventListener("error", (event) => {
      this.#logger.error("worker error:", event.message);
    });
    ws.addEventListener("message", (event) => {
      if (event.type !== "message") {
        this.#logger.warn("unexpected message type: " + event.type);
        return;
      }
      const msg = new import_protocol.ServerMessage();
      msg.fromBinary(event.data);
      if (this.#connecting && msg.message.case !== "register") {
        throw new WorkerError("expected register response as first message");
      }
      switch (msg.message.case) {
        case "register": {
          this.#id = msg.message.value.workerId;
          this.#logger.child({ id: this.id, server_info: msg.message.value.serverInfo }).info("registered worker");
          this.event.emit(
            "worker_registered",
            msg.message.value.workerId,
            msg.message.value.serverInfo
          );
          this.#connecting = false;
          break;
        }
        case "availability": {
          if (!msg.message.value.job) return;
          const task = this.#availability(msg.message.value);
          this.#tasks.push(task);
          task.finally(() => {
            const taskIndex = this.#tasks.indexOf(task);
            if (taskIndex !== -1) {
              this.#tasks.splice(taskIndex, 1);
            } else {
              throw new Error(`task ${task} not found in tasks`);
            }
          });
          break;
        }
        case "assignment": {
          if (!msg.message.value.job) return;
          const job = msg.message.value.job;
          if (job.id in this.#pending) {
            const task = this.#pending[job.id];
            delete this.#pending[job.id];
            task == null ? void 0 : task.resolve(msg.message.value);
          } else {
            this.#logger.child({ job }).warn("received assignment for unknown job " + job.id);
          }
          break;
        }
        case "termination": {
          const task = this.#termination(msg.message.value);
          this.#tasks.push(task);
          task.finally(() => {
            const taskIndex = this.#tasks.indexOf(task);
            if (taskIndex !== -1) {
              this.#tasks.splice(taskIndex, 1);
            } else {
              throw new Error(`task ${task} not found in tasks`);
            }
          });
          break;
        }
      }
    });
    this.event.emit(
      "worker_msg",
      new import_protocol.WorkerMessage({
        message: {
          case: "register",
          value: {
            type: this.#opts.workerType,
            agentName: this.#opts.agentName,
            allowedPermissions: new import_protocol.ParticipantPermission({
              canPublish: this.#opts.permissions.canPublish,
              canSubscribe: this.#opts.permissions.canSubscribe,
              canPublishData: this.#opts.permissions.canPublishData,
              canUpdateMetadata: this.#opts.permissions.canUpdateMetadata,
              hidden: this.#opts.permissions.hidden,
              agent: true
            }),
            version: import_version.version
          }
        }
      })
    );
    let currentStatus = import_protocol.WorkerStatus.WS_AVAILABLE;
    const loadMonitor = setInterval(() => {
      if (closingWS) clearInterval(loadMonitor);
      const oldStatus = currentStatus;
      this.#opts.loadFunc(this).then((currentLoad) => {
        const isFull = currentLoad >= this.#opts.loadThreshold;
        const currentlyAvailable = !isFull;
        currentStatus = currentlyAvailable ? import_protocol.WorkerStatus.WS_AVAILABLE : import_protocol.WorkerStatus.WS_FULL;
        if (oldStatus != currentStatus) {
          const extra = { load: currentLoad, loadThreshold: this.#opts.loadThreshold };
          if (isFull) {
            this.#logger.child(extra).info("worker is at full capacity, marking as unavailable");
          } else {
            this.#logger.child(extra).info("worker is below capacity, marking as available");
          }
        }
        this.event.emit(
          "worker_msg",
          new import_protocol.WorkerMessage({
            message: {
              case: "updateWorker",
              value: {
                load: currentLoad,
                status: currentStatus
              }
            }
          })
        );
      });
    }, UPDATE_LOAD_INTERVAL);
    await close;
    ws.removeAllListeners();
  }
  async #availability(msg) {
    let answered = false;
    const onReject = async () => {
      answered = true;
      this.event.emit(
        "worker_msg",
        new import_protocol.WorkerMessage({
          message: {
            case: "availability",
            value: {
              jobId: msg.job.id,
              available: false
            }
          }
        })
      );
    };
    const onAccept = async (args) => {
      var _a;
      answered = true;
      this.event.emit(
        "worker_msg",
        new import_protocol.WorkerMessage({
          message: {
            case: "availability",
            value: {
              jobId: msg.job.id,
              available: true,
              participantIdentity: args.identity,
              participantName: args.name,
              participantMetadata: args.metadata,
              participantAttributes: args.attributes
            }
          }
        })
      );
      this.#pending[req.id] = new PendingAssignment();
      const timer = setTimeout(() => {
        this.#logger.child({ req }).warn(`assignment for job ${req.id} timed out`);
        return;
      }, ASSIGNMENT_TIMEOUT);
      const asgn = await ((_a = this.#pending[req.id]) == null ? void 0 : _a.promise.then(async (asgn2) => {
        clearTimeout(timer);
        return asgn2;
      }));
      if (asgn) {
        await this.#procPool.launchJob({
          acceptArguments: args,
          job: msg.job,
          url: asgn.url || this.#opts.wsURL,
          token: asgn.token,
          workerId: this.id
        });
      } else {
        this.#logger.child({ requestId: req.id }).warn("pending assignment not found");
      }
    };
    const req = new import_job.JobRequest(msg.job, onReject, onAccept);
    this.#logger.child({ job: msg.job, resuming: msg.resuming, agentName: this.#opts.agentName }).info("received job request");
    const jobRequestTask = async () => {
      try {
        await this.#opts.requestFunc(req);
      } catch (e) {
        this.#logger.child({ job: msg.job, resuming: msg.resuming, agentName: this.#opts.agentName }).info("jobRequestFunc failed");
        await onReject();
      }
      if (!answered) {
        this.#logger.child({ job: msg.job, resuming: msg.resuming, agentName: this.#opts.agentName }).info("no answer was given inside the jobRequestFunc, automatically rejecting the job");
      }
    };
    const task = jobRequestTask();
    this.#tasks.push(task);
    task.finally(() => {
      const taskIndex = this.#tasks.indexOf(task);
      if (taskIndex !== -1) {
        this.#tasks.splice(taskIndex, 1);
      } else {
        throw new Error(`task ${task} not found in tasks`);
      }
    });
  }
  async #termination(msg) {
    const proc = this.#procPool.getByJobId(msg.jobId);
    if (proc === null) {
      return;
    }
    await proc.close();
  }
  async close() {
    var _a, _b;
    if (this.#closed) {
      await this.#close.await;
      return;
    }
    this.#logger.debug("shutting down worker");
    this.#closed = true;
    await ((_a = this.#inferenceExecutor) == null ? void 0 : _a.close());
    await this.#procPool.close();
    await this.#httpServer.close();
    await Promise.allSettled(this.#tasks);
    (_b = this.#session) == null ? void 0 : _b.close();
    await this.#close.await;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MissingCredentialsError,
  Worker,
  WorkerError,
  WorkerOptions,
  WorkerPermissions,
  defaultInitializeProcessFunc
});
//# sourceMappingURL=worker.cjs.map