import { WorkerOptions } from './worker.js';
/**
 * Exposes a CLI for creating a new worker, in development or production mode.
 *
 * @param opts - Options to launch the worker with
 * @example
 * ```
 * if (process.argv[1] === fileURLToPath(import.meta.url)) {
 *   cli.runApp(new WorkerOptions({ agent: import.meta.filename }));
 * }
 * ```
 */
export declare const runApp: (opts: WorkerOptions) => void;
//# sourceMappingURL=cli.d.ts.map