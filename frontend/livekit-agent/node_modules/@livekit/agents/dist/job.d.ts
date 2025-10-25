import type * as proto from '@livekit/protocol';
import type { E2EEOptions, LocalParticipant, RemoteParticipant, Room, RtcConfiguration } from '@livekit/rtc-node';
import type { InferenceExecutor } from './ipc/inference_executor.js';
/**
 * Returns the current job context.
 *
 * @throws {Error} if no job context is found
 */
export declare function getJobContext(): JobContext;
/**
 * Runs a function within a job context, similar to Python's contextvars.
 * @internal
 */
export declare function runWithJobContext<T>(context: JobContext, fn: () => T): T;
/**
 * Runs an async function within a job context, similar to Python's contextvars.
 * @internal
 */
export declare function runWithJobContextAsync<T>(context: JobContext, fn: () => Promise<T>): Promise<T>;
/** Which tracks, if any, should the agent automatically subscribe to? */
export declare enum AutoSubscribe {
    SUBSCRIBE_ALL = 0,
    SUBSCRIBE_NONE = 1,
    VIDEO_ONLY = 2,
    AUDIO_ONLY = 3
}
export type JobAcceptArguments = {
    name: string;
    identity: string;
    metadata: string;
    attributes?: {
        [key: string]: string;
    };
};
export type RunningJobInfo = {
    acceptArguments: JobAcceptArguments;
    job: proto.Job;
    url: string;
    token: string;
    workerId: string;
};
/** Attempted to add a function callback, but the function already exists. */
export declare class FunctionExistsError extends Error {
    constructor(msg?: string);
}
/** The job and environment context as seen by the agent, accessible by the entrypoint function. */
export declare class JobContext {
    #private;
    /** @internal */
    shutdownCallbacks: (() => Promise<void>)[];
    private connected;
    constructor(proc: JobProcess, info: RunningJobInfo, room: Room, onConnect: () => void, onShutdown: (s: string) => void, inferenceExecutor: InferenceExecutor);
    get proc(): JobProcess;
    get job(): proto.Job;
    get workerId(): string;
    /** @returns The room the agent was called into */
    get room(): Room;
    /** @returns The agent's participant if connected to the room, otherwise `undefined` */
    get agent(): LocalParticipant | undefined;
    /** @returns The global inference executor */
    get inferenceExecutor(): InferenceExecutor;
    /** Adds a promise to be awaited when {@link JobContext.shutdown | shutdown} is called. */
    addShutdownCallback(callback: () => Promise<void>): void;
    waitForParticipant(identity?: string): Promise<RemoteParticipant>;
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
    connect(e2ee?: E2EEOptions, autoSubscribe?: AutoSubscribe, rtcConfig?: RtcConfiguration): Promise<void>;
    /**
     * Gracefully shuts down the job, and runs all shutdown promises.
     *
     * @param reason - Optional reason for shutdown
     */
    shutdown(reason?: string): void;
    /** @internal */
    onParticipantConnected(p: RemoteParticipant): void;
    /**
     * Adds a promise to be awaited whenever a new participant joins the room.
     *
     * @throws {@link FunctionExistsError} if an entrypoint already exists
     */
    addParticipantEntrypoint(callback: (job: JobContext, p: RemoteParticipant) => Promise<void>): void;
}
export declare class JobProcess {
    #private;
    userData: {
        [id: string]: unknown;
    };
    get pid(): number;
}
/**
 * A request sent by the server to spawn a new agent job.
 *
 * @remarks
 * For most applications, this is best left to the default, which simply accepts the job and
 * handles the logic inside the entrypoint function. This class is useful for vetting which
 * requests should fill idle processes and which should be outright rejected.
 */
export declare class JobRequest {
    #private;
    /** @internal */
    constructor(job: proto.Job, onReject: () => Promise<void>, onAccept: (args: JobAcceptArguments) => Promise<void>);
    /** @returns The ID of the job, set by the LiveKit server */
    get id(): string;
    /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
    get job(): proto.Job;
    /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
    get room(): proto.Room | undefined;
    /** @see {@link https://www.npmjs.com/package/@livekit/protocol | @livekit/protocol} */
    get publisher(): proto.ParticipantInfo | undefined;
    /** @returns The agent's name, as set in {@link WorkerOptions} */
    get agentName(): string;
    /** Rejects the job. */
    reject(): Promise<void>;
    /** Accepts the job, launching it on an idle child process. */
    accept(name?: string, identity?: string, metadata?: string, attributes?: {
        [key: string]: string;
    }): Promise<void>;
}
//# sourceMappingURL=job.d.ts.map