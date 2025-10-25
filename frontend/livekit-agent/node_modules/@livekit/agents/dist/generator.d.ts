import type { JobContext, JobProcess } from './job.js';
/** @see {@link defineAgent} */
export interface Agent {
    entry: (ctx: JobContext) => Promise<void>;
    prewarm?: (proc: JobProcess) => unknown;
}
/** Helper to check if an object is an agent before running it.
 *
 * @internal
 */
export declare function isAgent(obj: unknown): obj is Agent;
/**
 * Helper to define an agent according to the required interface.
 * @example A basic agent with entry and prewarm functions
 * ```
 * export default defineAgent({
 *   entry: async (ctx: JobContext) => { ... },
 *   prewarm: (proc: JobProcess) => { ... },
 * })
 * ```
 */
export declare function defineAgent(agent: Agent): Agent;
//# sourceMappingURL=generator.d.ts.map