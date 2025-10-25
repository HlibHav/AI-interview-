import type { RunningJobInfo } from '../job.js';
export interface JobExecutor {
    started: boolean;
    userArguments: any;
    runningJob: RunningJobInfo | undefined;
    status: JobStatus;
    start(): Promise<void>;
    join(): Promise<void>;
    initialize(): Promise<void>;
    close(): Promise<void>;
    launchJob(info: RunningJobInfo): Promise<void>;
}
export declare enum JobStatus {
    RUNNING = 0,
    FAILED = 1,
    SUCCESS = 2
}
//# sourceMappingURL=job_executor.d.ts.map