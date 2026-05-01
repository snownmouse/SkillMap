import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/Logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };

    if (res.statusCode >= 500) {
      logger.error('请求失败', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('请求异常', logData);
    } else {
      logger.info('请求完成', logData);
    }
  });

  next();
}

export function logOperation(
  req: Request,
  event: string,
  data?: {
    treeId?: string;
    taskId?: string;
    userId?: string;
    duration?: number;
    error?: Error;
    [key: string]: any;
  }
) {
  const logData = {
    requestId: req.requestId,
    event,
    treeId: data?.treeId,
    taskId: data?.taskId,
    userId: data?.userId || (req as any).user?.id,
    duration: data?.duration,
    ...data
  };

  if (data?.error) {
    logger.error(event, logData);
  } else {
    logger.info(event, logData);
  }
}
