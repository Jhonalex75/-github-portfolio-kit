/**
 * AI Flow Utilities
 * Handles retry logic, rate limiting, and error handling for Genkit flows
 */

import { logger } from '@/lib/logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // milliseconds
  maxDelay?: number;
  backoffMultiplier?: number;
}

export interface RateLimitConfig {
  maxRequestsPerMinute?: number;
  maxRequestsPerHour?: number;
}

/**
 * Executes a function with exponential backoff retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`${context} - Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        break;
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );

      logger.warn(
        `${context} failed, retrying in ${delay}ms`,
        'AI.withRetry',
        { attempt, error: lastError.message }
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  logger.error(
    `${context} failed after ${maxAttempts} attempts`,
    lastError,
    'AI.withRetry'
  );

  throw lastError || new Error(`${context} failed after ${maxAttempts} attempts`);
}

/**
 * Rate Limiter for API calls
 */
class RateLimiter {
  private requestTimestamps: Map<string, number[]> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? 30,
      maxRequestsPerHour: config.maxRequestsPerHour ?? 1000,
    };
  }

  /**
   * Check if request is allowed and record it
   */
  async checkLimit(userId: string): Promise<boolean> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    if (!this.requestTimestamps.has(userId)) {
      this.requestTimestamps.set(userId, []);
    }

    const timestamps = this.requestTimestamps.get(userId)!;

    // Remove old timestamps
    const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);
    this.requestTimestamps.set(userId, recentTimestamps);

    // Check minute limit
    const lastMinuteRequests = recentTimestamps.filter(ts => ts > oneMinuteAgo).length;
    if (lastMinuteRequests >= this.config.maxRequestsPerMinute) {
      logger.warn(
        `Rate limit exceeded for user ${userId} (minute)`,
        'RateLimiter'
      );
      return false;
    }

    // Check hour limit
    if (recentTimestamps.length >= this.config.maxRequestsPerHour) {
      logger.warn(
        `Rate limit exceeded for user ${userId} (hour)`,
        'RateLimiter'
      );
      return false;
    }

    // Record this request
    recentTimestamps.push(now);
    return true;
  }

  /**
   * Get remaining requests for a user
   */
  getRemaining(userId: string): { minute: number; hour: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    const timestamps = this.requestTimestamps.get(userId) ?? [];
    const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);
    const lastMinuteRequests = recentTimestamps.filter(ts => ts > oneMinuteAgo).length;

    return {
      minute: Math.max(0, this.config.maxRequestsPerMinute - lastMinuteRequests),
      hour: Math.max(0, this.config.maxRequestsPerHour - recentTimestamps.length),
    };
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter({
  maxRequestsPerMinute: 30,
  maxRequestsPerHour: 1000,
});

/**
 * Combined retry + rate limit wrapper
 */
export async function withRetryAndRateLimit<T>(
  fn: () => Promise<T>,
  userId: string,
  context: string,
  retryOptions?: RetryOptions
): Promise<{ success: boolean; data?: T; error?: string; remaining?: { minute: number; hour: number } }> {
  // Check rate limit
  const allowed = await globalRateLimiter.checkLimit(userId);
  const remaining = globalRateLimiter.getRemaining(userId);

  if (!allowed) {
    logger.warn(`Rate limit exceeded for user ${userId}`, context);
    return {
      success: false,
      error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
      remaining,
    };
  }

  try {
    const data = await withRetry(fn, context, retryOptions);
    return { success: true, data, remaining };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      remaining,
    };
  }
}
