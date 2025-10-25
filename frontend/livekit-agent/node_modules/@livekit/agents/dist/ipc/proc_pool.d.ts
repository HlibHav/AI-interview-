import { MultiMutex, Mutex } from '@livekit/mutex';
import type { RunningJobInfo } from '../job.js';
import { Queue } from '../utils.js';
import type { InferenceExecutor } from './inference_executor.js';
import type { JobExecutor } from './job_executor.js';
export declare class ProcPool {
    agent: string;
    initializeTimeout: number;
    closeTimeout: number;
    executors: JobExecutor[];
    tasks: Promise<void>[];
    started: boolean;
    closed: boolean;
    controller: AbortController;
    initMutex: Mutex;
    procMutex?: MultiMutex;
    procUnlock?: () => void;
    warmedProcQueue: Queue<JobExecutor>;
    inferenceExecutor?: InferenceExecutor;
    memoryWarnMB: number;
    memoryLimitMB: number;
    constructor(agent: string, numIdleProcesses: number, initializeTimeout: number, closeTimeout: number, inferenceExecutor: InferenceExecutor | undefined, memoryWarnMB: number, memoryLimitMB: number);
    get processes(): JobExecutor[];
    getByJobId(id: string): JobExecutor | null;
    launchJob(info: RunningJobInfo): Promise<void>;
    procWatchTask(): Promise<void>;
    start(): void;
    run(signal: AbortSignal): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=proc_pool.d.ts.map