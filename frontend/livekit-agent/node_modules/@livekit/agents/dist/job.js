import { ParticipantKind, RoomEvent, TrackKind } from "@livekit/rtc-node";
import { AsyncLocalStorage } from "node:async_hooks";
import { log } from "./log.js";
const jobContextStorage = new AsyncLocalStorage();
function getJobContext() {
  const ctx = jobContextStorage.getStore();
  if (!ctx) {
    throw new Error("no job context found, are you running this code inside a job entrypoint?");
  }
  return ctx;
}
function runWithJobContext(context, fn) {
  return jobContextStorage.run(context, fn);
}
function runWithJobContextAsync(context, fn) {
  return jobContextStorage.run(context, fn);
}
var AutoSubscribe = /* @__PURE__ */ ((AutoSubscribe2) => {
  AutoSubscribe2[AutoSubscribe2["SUBSCRIBE_ALL"] = 0] = "SUBSCRIBE_ALL";
  AutoSubscribe2[AutoSubscribe2["SUBSCRIBE_NONE"] = 1] = "SUBSCRIBE_NONE";
  AutoSubscribe2[AutoSubscribe2["VIDEO_ONLY"] = 2] = "VIDEO_ONLY";
  AutoSubscribe2[AutoSubscribe2["AUDIO_ONLY"] = 3] = "AUDIO_ONLY";
  return AutoSubscribe2;
})(AutoSubscribe || {});
class FunctionExistsError extends Error {
  constructor(msg) {
    super(msg);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class JobContext {
  #proc;
  #info;
  #room;
  #onConnect;
  #onShutdown;
  /** @internal */
  shutdownCallbacks = [];
  #participantEntrypoints = [];
  #participantTasks = {};
  #logger;
  #inferenceExecutor;
  connected = false;
  constructor(proc, info, room, onConnect, onShutdown, inferenceExecutor) {
    this.#proc = proc;
    this.#info = info;
    this.#room = room;
    this.#onConnect = onConnect;
    this.#onShutdown = onShutdown;
    this.onParticipantConnected = this.onParticipantConnected.bind(this);
    this.#room.on(RoomEvent.ParticipantConnected, this.onParticipantConnected);
    this.#logger = log().child({ info: this.#info });
    this.#inferenceExecutor = inferenceExecutor;
  }
  get proc() {
    return this.#proc;
  }
  get job() {
    return this.#info.job;
  }
  get workerId() {
    return this.#info.workerId;
  }
  /** @returns The room the agent was called into */
  get room() {
    return this.#room;
  }
  /** @returns The agent's participant if connected to the room, otherwise `undefined` */
  get agent() {
    return this.#room.localParticipant;
  }
  /** @returns The global inference executor */
  get inferenceExecutor() {
    return this.#inferenceExecutor;
  }
  /** Adds a promise to be awaited when {@link JobContext.shutdown | shutdown} is called. */
  addShutdownCallback(callback) {
    this.shutdownCallbacks.push(callback);
  }
  async waitForParticipant(identity) {
    if (!this.#room.isConnected) {
      throw new Error("room is not connected");
    }
    for (const p of this.#room.remoteParticipants.values()) {
      if ((!identity || p.identity === identity) && p.info.kind != ParticipantKind.AGENT) {
        return p;
      }
    }
    return new Promise((resolve, reject) => {
      const onParticipantConnected = (participant) => {
        if ((!identity || participant.identity === identity) && participant.info.kind != ParticipantKind.AGENT) {
          clearHandlers();
          resolve(participant);
        }
      };
      const onDisconnected = () => {
        clearHandlers();
        reject(new Error("Room disconnected while waiting for participant"));
      };
      const clearHandlers = () => {
        this.#room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
        this.#room.off(RoomEvent.Disconnected, onDisconnected);
      };
      this.#room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
      this.#room.on(RoomEvent.Disconnected, onDisconnected);
    });
  }
  /**
   * Connects the agent to the room.
   *
   * @remarks
   * It is recommended to run this command as early in the function as possible, as executing it
   * later may cause noticeable delay between user and agent joins.
   *
   * @see {@link https://github.com/livekit/node-sdks/tree/main/packages/livekit-rtc#readme |
   * @livekit/rtc-node} for more information about the parameters.
   */
  async connect(e2ee, autoSubscribe = 0 /* SUBSCRIBE_ALL */, rtcConfig) {
    if (this.connected) {
      return;
    }
    const opts = {
      e2ee,
      autoSubscribe: autoSubscribe == 0 /* SUBSCRIBE_ALL */,
      rtcConfig,
      dynacast: false
    };
    await this.#room.connect(this.#info.url, this.#info.token, opts);
    this.#onConnect();
    this.#room.remoteParticipants.forEach(this.onParticipantConnected);
    if ([3 /* AUDIO_ONLY */, 2 /* VIDEO_ONLY */].includes(autoSubscribe)) {
      this.#room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (autoSubscribe === 3 /* AUDIO_ONLY */ && pub.kind === TrackKind.KIND_AUDIO || autoSubscribe === 2 /* VIDEO_ONLY */ && pub.kind === TrackKind.KIND_VIDEO) {
            pub.setSubscribed(true);
          }
        });
      });
    }
    this.connected = true;
  }
  /**
   * Gracefully shuts down the job, and runs all shutdown promises.
   *
   * @param reason - Optional reason for shutdown
   */
  shutdown(reason = "") {
    this.#onShutdown(reason);
  }
  /** @internal */
  onParticipantConnected(p) {
    var _a;
    for (const callback of this.#participantEntrypoints) {
      if (((_a = this.#participantTasks[p.identity]) == null ? void 0 : _a.callback) == callback) {
        this.#logger.warn(
          "a participant has joined before a prior prticipant task matching the same identity has finished:",
          p.identity
        );
      }
      const result = callback(this, p);
      result.finally(() => delete this.#participantTasks[p.identity]);
      this.#participantTasks[p.identity] = { callback, result };
    }
  }
  /**
   * Adds a promise to be awaited whenever a new participant joins the room.
   *
   * @throws {@link FunctionExistsError} if an entrypoint already exists
   */
  addParticipantEntrypoint(callback) {
    if (this.#participantEntrypoints.includes(callback)) {
      throw new FunctionExistsError("entrypoints cannot be added more than once");
    }
    this.#participantEntrypoints.push(callback);
  }
}
class JobProcess {
  #pid = process.pid;
  userData = {};
  get pid() {
    return this.#pid;
  }
}
class JobRequest {
  #job;
  #onReject;
  #onAccept;
  /** @internal */
  constructor(job, onReject, onAccept) {
    this.#job = job;
    this.#onReject = onReject;
    this.#onAccept = onAccept;
  }
  /** @returns The ID of the job, set by the LiveKit server */
  get id() {
    return this.#job.id;
  }
  /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
  get job() {
    return this.#job;
  }
  /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
  get room() {
    return this.#job.room;
  }
  /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
  get publisher() {
    return this.#job.participant;
  }
  /** @returns The agent's name, as set in {@link WorkerOptions} */
  get agentName() {
    return this.#job.agentName;
  }
  /** Rejects the job. */
  async reject() {
    await this.#onReject();
  }
  /** Accepts the job, launching it on an idle child process. */
  async accept(name = "", identity = "", metadata = "", attributes) {
    if (identity === "") identity = "agent-" + this.id;
    this.#onAccept({ name, identity, metadata, attributes });
  }
}
export {
  AutoSubscribe,
  FunctionExistsError,
  JobContext,
  JobProcess,
  JobRequest,
  getJobContext,
  runWithJobContext,
  runWithJobContextAsync
};
//# sourceMappingURL=job.js.map