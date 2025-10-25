/**
 * Raised when accepting a job but not receiving an assignment within the specified timeout.
 * The server may have chosen another worker to handle this job.
 */
export declare class AssignmentTimeoutError extends Error {
    constructor(message?: string);
}
/**
 * Interface for API error options
 */
interface APIErrorOptions {
    body?: object | null;
    retryable?: boolean;
}
/**
 * Raised when an API request failed.
 * This is used on our TTS/STT/LLM plugins.
 */
export declare class APIError extends Error {
    readonly body: object | null;
    readonly retryable: boolean;
    constructor(message: string, { body, retryable }?: APIErrorOptions);
    toString(): string;
}
/**
 * Interface for API status error options
 */
interface APIStatusErrorOptions extends APIErrorOptions {
    statusCode?: number;
    requestId?: string | null;
}
/**
 * Raised when an API response has a status code of 4xx or 5xx.
 */
export declare class APIStatusError extends APIError {
    readonly statusCode: number;
    readonly requestId: string | null;
    constructor({ message, options, }: {
        message?: string;
        options?: APIStatusErrorOptions;
    });
    toString(): string;
}
/**
 * Raised when an API request failed due to a connection error.
 */
export declare class APIConnectionError extends APIError {
    constructor({ message, options, }: {
        message?: string;
        options?: APIErrorOptions;
    });
}
/**
 * Raised when an API request timed out.
 */
export declare class APITimeoutError extends APIConnectionError {
    constructor({ message, options, }: {
        message?: string;
        options?: APIErrorOptions;
    });
}
export declare function isAPIError(error: unknown): error is APIError;
export {};
//# sourceMappingURL=_exceptions.d.ts.map