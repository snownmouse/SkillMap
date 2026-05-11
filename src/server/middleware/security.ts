import { Request, Response, NextFunction } from 'express';
import { rateLimitIncr } from '../services/RedisService';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  prefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    message = '请求过于频繁，请稍后再试',
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
    prefix = 'global',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const redisKey = `ratelimit:${prefix}:${key}`;
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const localKey = `${prefix}:${key}`;

    const applyLocal = () => {
      const entry = rateLimitStore.get(localKey);

      if (!entry || now > entry.resetTime) {
        rateLimitStore.set(localKey, { count: 1, resetTime: now + windowMs });
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
        res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
        return next();
      }

      entry.count++;

      const remaining = Math.max(0, maxRequests - entry.count);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      if (entry.count > maxRequests) {
        res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
        res.status(429).json({ error: message });
        return;
      }

      next();
    };

    rateLimitIncr(redisKey, windowSeconds).then((count) => {
      if (count === null) {
        applyLocal();
        return;
      }
      const remaining = Math.max(0, maxRequests - count);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      if (count > maxRequests) {
        res.setHeader('Retry-After', windowSeconds);
        res.status(429).json({ error: message });
        return;
      }
      next();
    }).catch(() => {
      applyLocal();
    });
  };
}

export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    }
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

function sanitizeString(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
}

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}

export function bodySizeLimit(maxBytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      res.status(413).json({
        error: `请求体过大，最大允许 ${Math.round(maxBytes / 1024)}KB`,
        maxSizeBytes: maxBytes,
      });
      return;
    }
    next();
  };
}

const MAX_TASKS = 1000;
const TASK_MAX_AGE_MS = 30 * 60 * 1000;

export function cleanupStaleTasks(tasks: Map<string, any>) {
  const now = Date.now();
  let cleaned = 0;

  const entries = Array.from(tasks.entries());
  entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

  for (const [id, task] of entries) {
    const age = now - task.createdAt.getTime();
    const isTerminal = task.status === 'completed' || task.status === 'failed';

    if (isTerminal && age > TASK_MAX_AGE_MS) {
      tasks.delete(id);
      cleaned++;
    }
  }

  if (tasks.size > MAX_TASKS) {
    const toDelete = Array.from(tasks.entries())
      .filter(([_, t]) => t.status === 'completed' || t.status === 'failed')
      .sort((a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime())
      .slice(0, tasks.size - MAX_TASKS);

    for (const [id] of toDelete) {
      tasks.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info('任务清理完成', { cleaned, remaining: tasks.size });
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
