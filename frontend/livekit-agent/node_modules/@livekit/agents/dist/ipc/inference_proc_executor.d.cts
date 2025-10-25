/// <reference types="node" resolution-mode="require"/>
import type { ChildProcess } from 'node:child_process';
import type { InferenceExecutor } from './inference_executor.js';
import { SupervisedProc } from './supervised_proc.js';
export declare class InferenceProcExecutor extends SupervisedProc implements InferenceExecutor {
    #private;
    constructor({ runners, initializeTimeout, closeTimeout, memoryWarnMB, memoryLimitMB, pingInterval, pingTimeout, highPingThreshold, }: {
        runners: {
            [id: string]: string;
        };
        initializeTimeout: number;
        closeTimeout: number;
        memoryWarnMB: number;
        memoryLimitMB: number;
        pingInterval: number;
        pingTimeout: number;
        highPingThreshold: number;
    });
    createProcess(): ChildProcess;
    mainTask(proc: ChildProcess): Promise<void>;
    doInference(method: string, data: unknown): Promise<unknown>;
}
//# sourceMappingURL=inference_proc_executor.d.ts.map