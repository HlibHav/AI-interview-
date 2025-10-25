/**
 * LiveKit Error Handler Utility
 * Provides graceful error handling for LiveKit DataChannel and connection errors
 */

export interface LiveKitErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: any) => void;
  onRetry?: (attempt: number) => void;
}

export class LiveKitErrorHandler {
  private retryCount = 0;
  private maxRetries: number;
  private retryDelay: number;
  private onError?: (error: any) => void;
  private onRetry?: (attempt: number) => void;

  constructor(options: LiveKitErrorHandlerOptions = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.onError = options.onError;
    this.onRetry = options.onRetry;
  }

  /**
   * Handle DataChannel errors gracefully
   * These errors are often non-critical and don't require disconnection
   */
  handleDataChannelError(error: any): void {
    console.warn("DataChannel error (non-critical):", {
      type: error.type,
      reason: error.reason,
      message: error.message
    });

    // Don't trigger retry for DataChannel errors as they're often expected
    // during connection cleanup or user-initiated aborts
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error: any, retryFn: () => Promise<void>): Promise<void> {
    console.error("Connection error:", error);

    if (this.onError) {
      this.onError(error);
    }

    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying connection (attempt ${this.retryCount}/${this.maxRetries})...`);
      
      if (this.onRetry) {
        this.onRetry(this.retryCount);
      }

      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      try {
        await retryFn();
        this.retryCount = 0; // Reset on successful retry
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw retryError;
      }
    } else {
      console.error("Max retries exceeded, giving up");
      throw new Error("Connection failed after maximum retries");
    }
  }

  /**
   * Check if error is a user-initiated abort (expected behavior)
   */
  isUserInitiatedAbort(error: any): boolean {
    return error?.reason === "User-Initiated Abort" || 
           error?.message?.includes("User-Initiated Abort") ||
           error?.type === "abort";
  }

  /**
   * Check if error is recoverable
   */
  isRecoverableError(error: any): boolean {
    // Network errors, timeouts, and temporary connection issues are recoverable
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /websocket/i,
      /temporary/i
    ];

    return recoverablePatterns.some(pattern => 
      pattern.test(error?.message || "") || 
      pattern.test(error?.reason || "")
    );
  }

  /**
   * Reset retry counter
   */
  reset(): void {
    this.retryCount = 0;
  }
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new LiveKitErrorHandler({
  maxRetries: 3,
  retryDelay: 2000,
  onError: (error) => {
    console.error("LiveKit error:", error);
  },
  onRetry: (attempt) => {
    console.log(`Retrying connection (attempt ${attempt})...`);
  }
});
