/**
 * Rate limiter for API calls to prevent overwhelming external services
 * Implements token bucket algorithm
 */

type RateLimiterOptions = {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
  key?: string; // Optional key for per-key rate limiting
};

class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  /**
   * Check if request is allowed and record it
   * @param key Optional key for per-key rate limiting (default: 'default')
   * @returns true if request is allowed, false if rate limited
   */
  isAllowed(key: string = 'default'): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove requests outside the time window
    const validRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    // Check if we've exceeded the limit
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Record this request
    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   * @param key Optional key for per-key rate limiting
   * @returns milliseconds until next request is allowed, or 0 if allowed now
   */
  getTimeUntilNextRequest(key: string = 'default'): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter((timestamp) => now - timestamp < this.windowMs);

    if (validRequests.length < this.maxRequests) {
      return 0;
    }

    // Find the oldest request in the window
    const oldestRequest = Math.min(...validRequests);
    const timeUntilOldestExpires = this.windowMs - (now - oldestRequest);

    return Math.max(0, timeUntilOldestExpires);
  }

  /**
   * Wait until request is allowed (with timeout)
   * @param key Optional key for per-key rate limiting
   * @param timeoutMs Maximum time to wait (default: windowMs)
   * @returns Promise that resolves when request is allowed, or rejects on timeout
   */
  async waitUntilAllowed(key: string = 'default', timeoutMs?: number): Promise<void> {
    const timeout = timeoutMs || this.windowMs;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (this.isAllowed(key)) {
        return;
      }

      const waitTime = Math.min(this.getTimeUntilNextRequest(key), 100); // Check every 100ms
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    throw new Error(`Rate limit timeout: waited ${timeout}ms for ${key}`);
  }

  /**
   * Clear rate limit data for a key (or all keys if no key provided)
   */
  clear(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// Global rate limiter for BEY API calls
// Limits: 10 requests per second (conservative to avoid rate limiting)
export const beyApiRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 1000, // 1 second
});

// Rate limiter for polling endpoints (more lenient)
export const pollingRateLimiter = new RateLimiter({
  maxRequests: 20, // 20 requests per minute
  windowMs: 60000, // 1 minute
});

/**
 * Wrapper function to make rate-limited API calls
 * @param fn Function that makes the API call
 * @param limiter Rate limiter instance
 * @param key Optional key for per-key rate limiting
 * @returns Promise with the result of the API call
 */
export async function rateLimitedCall<T>(
  fn: () => Promise<T>,
  limiter: RateLimiter = beyApiRateLimiter,
  key: string = 'default'
): Promise<T> {
  // Wait until request is allowed
  await limiter.waitUntilAllowed(key, limiter['windowMs'] * 2);

  // Make the request
  return fn();
}

/**
 * Add delay between requests to prevent overwhelming the API
 * @param ms Milliseconds to delay (default: 100ms)
 */
export async function delay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

