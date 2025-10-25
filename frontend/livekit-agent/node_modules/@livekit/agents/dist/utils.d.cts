/// <reference types="node" resolution-mode="require"/>
import type { ParticipantKind, RemoteParticipant, RemoteTrackPublication, Room, TrackKind } from '@livekit/rtc-node';
import { AudioFrame } from '@livekit/rtc-node';
import type { ReadableStream } from 'node:stream/web';
/** Union of a single and a list of {@link AudioFrame}s */
export type AudioBuffer = AudioFrame[] | AudioFrame;
export declare const noop: () => void;
export declare const isPending: (promise: Promise<unknown>) => Promise<boolean>;
/**
 * Merge one or more {@link AudioFrame}s into a single one.
 *
 * @param buffer - Either an {@link AudioFrame} or a list thereof
 * @throws
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
 * | TypeError} if sample rate or channel count are mismatched
 */
export declare const mergeFrames: (buffer: AudioBuffer) => AudioFrame;
/** @internal */
export declare class Queue<T> {
    #private;
    /** @internal */
    items: T[];
    constructor(limit?: number);
    get(): Promise<T>;
    put(item: T): Promise<void>;
}
/** @internal */
export declare class Future<T = void> {
    #private;
    constructor();
    get await(): Promise<T>;
    get done(): boolean;
    resolve(value: T): void;
    reject(error: Error): void;
}
/** @internal */
export declare class Event {
    #private;
    wait(): Promise<boolean>;
    get isSet(): boolean;
    set(): void;
    clear(): void;
}
/** @internal */
export declare class CancellablePromise<T> {
    #private;
    constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void, onCancel: (cancelFn: () => void) => void) => void);
    get isCancelled(): boolean;
    get error(): Error | null;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | Promise<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | Promise<TResult2>) | null): Promise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: unknown) => TResult | Promise<TResult>) | null): Promise<T | TResult>;
    finally(onfinally?: (() => void) | null): Promise<T>;
    cancel(): void;
    static from<T>(promise: Promise<T>): CancellablePromise<T>;
}
/** @internal */
export declare function gracefullyCancel<T>(promise: CancellablePromise<T>): Promise<void>;
/** @internal */
export declare class AsyncIterableQueue<T> implements AsyncIterableIterator<T> {
    #private;
    private static readonly CLOSE_SENTINEL;
    get closed(): boolean;
    put(item: T): void;
    close(): void;
    next(): Promise<IteratorResult<T>>;
    [Symbol.asyncIterator](): AsyncIterableQueue<T>;
}
/** @internal */
export declare class ExpFilter {
    #private;
    constructor(alpha: number, max?: number);
    reset(alpha?: number): void;
    apply(exp: number, sample: number): number;
    get filtered(): number | undefined;
    set alpha(alpha: number);
}
/** @internal */
export declare class AudioEnergyFilter {
    #private;
    constructor(cooldownSeconds?: number);
    pushFrame(frame: AudioFrame): boolean;
}
export declare const TASK_TIMEOUT_ERROR: Error;
export declare enum TaskResult {
    Timeout = "timeout",
    Completed = "completed",
    Aborted = "aborted"
}
/** @internal */
/**
 * A task that can be cancelled.
 *
 * We recommend using the `Task.from` method to create a task. When creating subtasks, pass the same controller to all subtasks.
 *
 * @example
 * ```ts
 * const parent = Task.from((controller) => {
 *   const child1 = Task.from(() => { ... }, controller);
 *   const child2 = Task.from(() => { ... }, controller);
 * });
 * parent.cancel();
 * ```
 *
 * This will cancel all subtasks when the parent is cancelled.
 *
 * @param T - The type of the task result
 */
export declare class Task<T> {
    #private;
    private readonly fn;
    private readonly controller;
    readonly name?: string | undefined;
    private resultFuture;
    constructor(fn: (controller: AbortController) => Promise<T>, controller: AbortController, name?: string | undefined);
    /**
     * Creates a new task from a function.
     *
     * @param fn - The function to run
     * @param controller - The abort controller to use
     * @returns A new task
     */
    static from<T>(fn: (controller: AbortController) => Promise<T>, controller?: AbortController, name?: string): Task<T>;
    private runTask;
    /**
     * Cancels the task.
     */
    cancel(): void;
    /**
     * Cancels the task and waits for it to complete.
     *
     * @param timeout - The timeout in milliseconds
     * @returns The result status of the task (timeout, completed, aborted)
     */
    cancelAndWait(timeout?: number): Promise<TaskResult.Completed | TaskResult.Aborted>;
    /**
     * The result of the task.
     */
    get result(): Promise<T>;
    /**
     * Whether the task has completed.
     */
    get done(): boolean;
    addDoneCallback(callback: () => void): void;
}
export declare function waitFor(tasks: Task<void>[]): Promise<void>;
export declare function cancelAndWait(tasks: Task<any>[], timeout?: number): Promise<void>;
export declare function withResolvers<T = unknown>(): {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
};
/**
 * Generates a short UUID with a prefix. Mirrors the python agents implementation.
 *
 * @param prefix - The prefix to add to the UUID.
 * @returns A short UUID with the prefix.
 */
export declare function shortuuid(prefix?: string): string;
/**
 * Creates a read-only proxy for an array.
 * @param array - The array to make read-only.
 * @param additionalErrorMessage - An additional error message to include in the error thrown when a mutation method is called.
 * @returns A read-only proxy for the array.
 */
export declare function createImmutableArray<T>(array: T[], additionalErrorMessage?: string): T[];
export declare function isImmutableArray(array: unknown): boolean;
/**
 * Resamples an audio stream to a target sample rate.
 *
 * WARINING: The input stream will be locked until the resampled stream is closed.
 *
 * @param stream - The input stream to resample.
 * @param outputRate - The target sample rate.
 * @returns A new stream with the resampled audio.
 */
export declare function resampleStream({ stream, outputRate, }: {
    stream: ReadableStream<AudioFrame>;
    outputRate: number;
}): ReadableStream<AudioFrame>;
export declare class InvalidErrorType extends Error {
    readonly error: unknown;
    constructor(error: unknown);
}
/**
 * In JS an error can be any arbitrary value.
 * This function converts an unknown error to an Error and stores the original value in the error object.
 *
 * @param error - The error to convert.
 * @returns An Error.
 */
export declare function toError(error: unknown): Error;
/**
 * This is a hack to immitate asyncio.create_task so that
 * func will be run after the current event loop iteration.
 *
 * @param func - The function to run.
 */
export declare function startSoon(func: () => void): void;
export type DelayOptions = {
    signal?: AbortSignal;
};
/**
 * Delay for a given number of milliseconds.
 *
 * @param ms - The number of milliseconds to delay.
 * @param options - The options for the delay.
 * @returns A promise that resolves after the delay.
 */
export declare function delay(ms: number, options?: DelayOptions): Promise<void>;
/**
 * Returns a participant that matches the given identity. If identity is None, the first
 * participant that joins the room will be returned.
 * If the participant has already joined, the function will return immediately.
 * @param room - The room to wait for a participant in.
 * @param identity - The identity of the participant to wait for.
 * @param kind - The kind of the participant to wait for.
 * @returns A promise that resolves to the participant.
 */
export declare function waitForParticipant({ room, identity, kind, }: {
    room: Room;
    identity?: string;
    kind?: ParticipantKind | ParticipantKind[];
}): Promise<RemoteParticipant>;
export declare function waitForTrackPublication({ room, identity, kind, }: {
    room: Room;
    identity: string;
    kind: TrackKind;
}): Promise<RemoteTrackPublication>;
export declare function waitForAbort(signal: AbortSignal): Promise<void>;
//# sourceMappingURL=utils.d.ts.map