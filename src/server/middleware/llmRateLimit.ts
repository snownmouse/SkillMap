import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const userLimits: Map<string, RateLimitEntry> = new Map();

const isDev = process.env.NODE_ENV !== 'production';
const LIMITS = {
  chat: { windowMs: 60 * 60 * 1000, maxRequests: isDev ? 9999 : 30 },
  tree_generate: { windowMs: 60 * 60 * 1000, maxRequests: isDev ? 9999 : 5 },
  default: { windowMs: 60 * 1000, maxRequests: isDev ? 9999 : 20 },
};

let globalLlmCalls = { count: 0, resetAt: Date.now() + 60 * 1000 };
const GLOBAL_LLM_LIMIT = isDev ? 500 : 100;

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
  const path = req.path || '';
  let action: keyof typeof LIMITS = 'default';
  if (path.includes('/generate')) action = 'tree_generate';
  else if (path.includes('/chat')) action = 'chat';
  const key = `llm:${userId}:${action}`;
  const limit = LIMITS[action];

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
      window: action === 'tree_generate' ? '1小时' : '1小时',
      type: action,
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
