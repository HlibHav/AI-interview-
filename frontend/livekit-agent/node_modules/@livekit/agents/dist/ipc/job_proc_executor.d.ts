/// <reference types="node" resolution-mode="require"/>
import type { ChildProcess } from 'node:child_process';
import type { RunningJobInfo } from '../job.js';
import type { InferenceExecutor } from './inference_executor.js';
import type { JobExecutor } from './job_executor.js';
import { JobStatus } from './job_executor.js';
import { SupervisedProc } from './supervised_proc.js';
export declare class JobProcExecutor extends SupervisedProc implements JobExecutor {
    #private;
    constructor(agent: string, inferenceExecutor: InferenceExecutor | undefined, initializeTimeout: number, closeTimeout: number, memoryWarnMB: number, memoryLimitMB: number, pingInterval: number, pingTimeout: number, highPingThreshold: number);
    get status(): JobStatus;
    get userArguments(): any;
    set userArguments(args: any);
    get runningJob(): RunningJobInfo | undefined;
    createProcess(): ChildProcess;
    mainTask(proc: ChildProcess): Promise<void>;
    launchJob(info: RunningJobInfo): Promise<void>;
}
//# sourceMappingURL=job_proc_executor.d.ts.map