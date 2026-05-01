import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestTracer(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  const startTime = Date.now();

  (req as any).requestId = requestId;
  (req as any).startTime = startTime;

  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userId = (req as any).user?.id || 'anonymous';
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';

    if (level === 'ERROR' || duration > 5000) {
      console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms user=${userId} req=${requestId}`);
    }
  });

  next();
}
