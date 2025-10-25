export declare class APIConnectOptions {
    /** Maximum number of retries to connect to the API. */
    readonly maxRetry: number;
    /** Interval between retries to connect to the API in milliseconds. */
    readonly retryIntervalMs: number;
    /** Timeout for connecting to the API in milliseconds. */
    readonly timeoutMs: number;
    constructor(options?: Partial<APIConnectOptions>);
    /** @internal */
    _intervalForRetry(numRetries: number): number;
}
export declare const DEFAULT_API_CONNECT_OPTIONS: APIConnectOptions;
//# sourceMappingURL=types.d.ts.map