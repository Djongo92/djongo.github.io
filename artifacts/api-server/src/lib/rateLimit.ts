import type { Request, Response, NextFunction } from "express";

export interface RateLimitOptions {
  /** Length of the fixed window, in milliseconds. */
  windowMs: number;
  /** Requests allowed per IP per window. */
  max: number;
  /** Body returned as `{ message }` once the window is exhausted. */
  message: string;
}

export interface RateLimitMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  /** Test-only: clear accumulated state between cases. */
  reset(): void;
}

/**
 * Fixed-window per-IP rate limiter.
 *
 * In-process and therefore per-instance: it is a brake on casual abuse and
 * credential guessing from one client, not a distributed quota. Anything that
 * needs a real guarantee across instances needs shared state.
 */
export function createRateLimit({ windowMs, max, message }: RateLimitOptions): RateLimitMiddleware {
  const hits = new Map<string, { count: number; windowStart: number }>();

  // Periodically drop stale entries so the map can't grow unbounded.
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) {
      if (now - entry.windowStart > windowMs) hits.delete(ip);
    }
  }, windowMs).unref();

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || now - entry.windowStart > windowMs) {
      hits.set(ip, { count: 1, windowStart: now });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ message });
      return;
    }
    next();
  };

  middleware.reset = () => hits.clear();
  return middleware;
}
