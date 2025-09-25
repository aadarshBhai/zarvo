import { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };
const buckets: Record<string, Bucket> = {};

function makeLimiter(max: number, windowMs: number, message: string) {
  return function limiter(req: Request, res: Response, next: NextFunction) {
    try {
      const key = `${req.ip}:${req.path}`;
      const now = Date.now();
      const bucket = buckets[key] || { count: 0, resetAt: now + windowMs };
      if (now > bucket.resetAt) {
        bucket.count = 0;
        bucket.resetAt = now + windowMs;
      }
      bucket.count += 1;
      buckets[key] = bucket;
      if (bucket.count > max) {
        const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({ message });
      }
      return next();
    } catch (_e) {
      return next();
    }
  };
}

export const signupLimiter = makeLimiter(50, 15 * 60 * 1000, "Too many signup attempts. Please try again later.");
export const otpLimiter = makeLimiter(20, 10 * 60 * 1000, "Too many requests. Please try again later.");
