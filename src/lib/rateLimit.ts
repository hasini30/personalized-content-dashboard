export interface RateLimitOptions {
  intervalMs?: number;
  maxRequests?: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export class MemoryRateLimiter {
  private cache = new Map<string, ClientRecord>();
  private intervalMs: number;
  private maxRequests: number;

  constructor(options: RateLimitOptions = {}) {
    this.intervalMs = options.intervalMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 60; // 60 requests per minute default
  }

  public check(identifier: string): RateLimitResult {
    const now = Date.now();
    const record = this.cache.get(identifier);

    // Evict expired entries if table grows
    if (this.cache.size > 10000) {
      this.cache.forEach((val, key) => {
        if (now > val.resetTime) {
          this.cache.delete(key);
        }
      });
    }

    const isLocalDev =
      process.env.NODE_ENV === 'development' &&
      (identifier.endsWith(':127.0.0.1') || identifier.endsWith(':::1'));
    const effectiveLimit = isLocalDev ? Math.max(this.maxRequests, 300) : this.maxRequests;

    if (!record || now > record.resetTime) {
      // First request or window expired
      const resetTime = now + this.intervalMs;
      this.cache.set(identifier, { count: 1, resetTime });
      return {
        success: true,
        limit: effectiveLimit,
        remaining: effectiveLimit - 1,
        reset: resetTime,
      };
    }

    if (record.count >= effectiveLimit) {
      // Limit exceeded
      return {
        success: false,
        limit: effectiveLimit,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: effectiveLimit,
      remaining: effectiveLimit - record.count,
      reset: record.resetTime,
    };
  }

  public reset(): void {
    this.cache.clear();
  }
}

// Global singleton rate limiter for general API routes (60 req / min)
export const globalApiRateLimiter = new MemoryRateLimiter({
  intervalMs: 60 * 1000,
  maxRequests: 60,
});
