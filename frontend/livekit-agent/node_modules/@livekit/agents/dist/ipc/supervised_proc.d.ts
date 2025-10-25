/// <reference types="node" resolution-mode="require"/>
import type { ChildProcess } from 'node:child_process';
import type { RunningJobInfo } from '../job.js';
import { Future } from '../utils.js';
export interface ProcOpts {
    initializeTimeout: number;
    closeTimeout: number;
    memoryWarnMB: number;
    memoryLimitMB: number;
    pingInterval: number;
    pingTimeout: number;
    highPingThreshold: number;
}
export declare abstract class SupervisedProc {
    #private;
    proc?: ChildProcess;
    protected init: Future<void>;
    constructor(initializeTimeout: number, closeTimeout: number, memoryWarnMB: number, memoryLimitMB: number, pingInterval: number, pingTimeout: number, highPingThreshold: number);
    abstract createProcess(): ChildProcess;
    abstract mainTask(child: ChildProcess): Promise<void>;
    get started(): boolean;
    get runningJob(): RunningJobInfo | undefined;
    start(): Promise<void>;
    run(): Promise<void>;
    join(): Promise<void>;
    initialize(): Promise<void>;
    close(): Promise<void>;
    launchJob(info: RunningJobInfo): Promise<void>;
    private getChildMemoryUsageMB;
    private clearTimers;
}
//# sourceMappingURL=supervised_proc.d.ts.map