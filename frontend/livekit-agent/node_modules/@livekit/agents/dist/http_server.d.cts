/// <reference types="node" resolution-mode="require"/>
import { type Server } from 'node:http';
interface WorkerResponse {
    agent_name: string;
    worker_type: string;
    active_jobs: number;
    sdk_version: string;
    project_type: string;
}
export declare class HTTPServer {
    #private;
    host: string;
    port: number;
    app: Server;
    constructor(host: string, port: number, workerListener: () => WorkerResponse);
    run(): Promise<void>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=http_server.d.ts.map