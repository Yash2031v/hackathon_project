import type { Request, Response, NextFunction } from 'express';
import type { ApiErrorResponse } from '../../../frontend/src/domain/contracts/apiContracts';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs?: number;       // default: 60,000 ms (1 minute)
  maxRequests?: number;    // default: 120 requests per window
  disabled?: boolean;      // allows bypassing during high-frequency integration tests
}

/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter middleware.
 * Prevents endpoint brute-force and resource exhaustion attacks.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const maxRequests = options.maxRequests ?? 120;
  const disabled = options.disabled ?? (process.env.NODE_ENV === 'test');

  const ipStore = new Map<string, RateLimitRecord>();

  // Periodically clean up expired records every 5 minutes to avoid memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipStore.entries()) {
      if (now > record.resetTime) {
        ipStore.delete(key);
      }
    }
  }, 300_000);

  // Unref interval so it does not block Node process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req: Request, res: Response, next: NextFunction): void {
    if (disabled) {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();

    let record = ipStore.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      ipStore.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetSeconds.toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', resetSeconds.toString());
      const errorResponse: ApiErrorResponse = {
        statusCode: 429,
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please slow down and try again later.',
        details: [`Exceeded maximum limit of ${maxRequests} requests per ${windowMs / 1000}s`],
        requestId: req.id || 'unknown',
        timestamp: new Date().toISOString(),
      };
      res.status(429).json(errorResponse);
      return;
    }

    next();
  };
}
