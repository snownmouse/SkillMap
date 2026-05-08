import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  code: string;
  statusCode: number;
  userMessage: string;
  details?: Record<string, unknown>;

  constructor(code: string, statusCode: number, userMessage: string, details?: Record<string, unknown>) {
    super(userMessage);
    this.code = code;
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string = '未授权') {
    super('AUTH_ERROR', 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super('FORBIDDEN_ERROR', 403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super('NOT_FOUND_ERROR', 404, message);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super('RATE_LIMIT_ERROR', 429, message);
  }
}

export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误', details?: Record<string, unknown>) {
    super('INTERNAL_ERROR', 500, message, details);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || 'unknown';
  const userId = (req as any).user?.id || 'anonymous';

  if (err instanceof AppError) {
    logger.error('Handled error', {
      code: err.code,
      statusCode: err.statusCode,
      message: err.userMessage,
      requestId,
      userId,
      path: req.path,
      method: req.method,
      details: err.details,
    });

    res.status(err.statusCode).json({
      error: err.userMessage,
      code: err.code,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    requestId,
    userId,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
    code: 'UNHANDLED_ERROR',
  });
}

export const errors = {
  validation: (message: string, details?: Record<string, unknown>) => new ValidationError(message, details),
  unauthorized: (message?: string) => new AuthError(message),
  forbidden: (message?: string) => new ForbiddenError(message),
  notFound: (message?: string) => new NotFoundError(message),
  rateLimit: (message?: string) => new RateLimitError(message),
  internal: (message?: string, details?: Record<string, unknown>) => new InternalError(message, details),
};

export function asyncHandler<T extends (...args: [Request, Response, NextFunction]) => Promise<any>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}