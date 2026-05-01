import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userLimits: Map<string, RateLimitEntry> = new Map();

const LIMITS = {
  chat: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
  tree_generate: { windowMs: 60 * 60 * 1000, maxRequests: 5 },
  default: { windowMs: 60 * 1000, maxRequests: 20 },
};

let globalLlmCalls = { count: 0, resetAt: Date.now() + 60 * 1000 };
const GLOBAL_LLM_LIMIT = 100;

export function llmRateLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();

  if (now > globalLlmCalls.resetAt) {
    globalLlmCalls = { count: 0, resetAt: now + 60 * 1000 };
  }

  if (globalLlmCalls.count >= GLOBAL_LLM_LIMIT) {
    res.status(429).json({
      error: '服务器繁忙，请稍后再试',
      retryAfter: Math.ceil((globalLlmCalls.resetAt - now) / 1000),
    });
    return;
  }

  const userId = (req as any).user?.id || req.ip || 'unknown';
  const key = `llm:${userId}`;
  const limit = LIMITS.chat;

  let entry = userLimits.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    userLimits.set(key, entry);
  }

  if (entry.count >= limit.maxRequests) {
    res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      limit: limit.maxRequests,
      window: '1小时',
    });
    return;
  }

  entry.count++;
  globalLlmCalls.count++;

  res.setHeader('X-RateLimit-Limit', limit.maxRequests);
  res.setHeader('X-RateLimit-Remaining', limit.maxRequests - entry.count);
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

  next();
}

export function checkLlmLimit(userId: string, action: string): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();

  if (now > globalLlmCalls.resetAt) {
    globalLlmCalls = { count: 0, resetAt: now + 60 * 1000 };
  }

  if (globalLlmCalls.count >= GLOBAL_LLM_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((globalLlmCalls.resetAt - now) / 1000),
    };
  }

  const key = `llm:${userId}:${action}`;
  const limit = LIMITS[action as keyof typeof LIMITS] || LIMITS.default;

  let entry = userLimits.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + limit.windowMs };
    userLimits.set(key, entry);
  }

  if (entry.count >= limit.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit.maxRequests - entry.count,
  };
}
