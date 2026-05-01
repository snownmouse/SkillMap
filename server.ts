import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import dotenv from 'dotenv';
import compression from 'compression';

dotenv.config();

import { getConfig } from './src/server/config';

async function startServer() {
  const config = getConfig();
  const app = express();
  const PORT = config.port;

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  const { getPool, closePool } = await import('./src/server/database');
  await getPool();

  const { treeRouter } = await import('./src/server/routes/tree');
  const { chatRouter } = await import('./src/server/routes/chat');
  const { authRouter } = await import('./src/server/routes/auth');
  const { careerRouter } = await import('./src/server/routes/career');
  const { debugRouter } = await import('./src/server/routes/debug');
  const { optionalAuth } = await import('./src/server/controllers/authController');
  const { treeController } = await import('./src/server/controllers/treeController');
  const { initWebSocket } = await import('./src/server/websocket');
  const { rateLimit, sanitizeInput, securityHeaders } = await import('./src/server/middleware/security');
  const { requestTracer } = await import('./src/server/middleware/requestTracer');
  const { metricsMiddleware, metricsService } = await import('./src/server/middleware/metrics');
  const { alertService } = await import('./src/server/services/AlertService');
  const { llmRateLimiter } = await import('./src/server/middleware/llmRateLimit');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(compression());
  app.use(securityHeaders);
  app.use(sanitizeInput);
  app.use(requestTracer);
  app.use(metricsMiddleware);

  app.use('/api/debug', optionalAuth, debugRouter);

  app.get('/api/tasks/:taskId', optionalAuth, treeController.getTaskStatus);
  app.post('/api/tasks/:taskId/cancel', optionalAuth, treeController.cancelTask);

  if (process.env.NODE_ENV === 'production') {
    app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 }), authRouter);
    app.use('/api/careers', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }), optionalAuth, careerRouter);
    app.use('/api/trees/:treeId/chat', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }), llmRateLimiter, optionalAuth, chatRouter);
    app.use('/api/trees', rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }), optionalAuth, treeRouter);
  } else {
    app.use('/api/auth', authRouter);
    app.use('/api/careers', optionalAuth, careerRouter);
    app.use('/api/trees/:treeId/chat', llmRateLimiter, optionalAuth, chatRouter);
    app.use('/api/trees', optionalAuth, treeRouter);
  }

  app.get('/api/health', async (req, res) => {
    try {
      const snapshot = await metricsService.getSnapshot();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.VERSION || 'unknown',
        metrics: snapshot,
      });
    } catch {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
  });

  app.get('/api/metrics', async (req, res) => {
    try {
      const snapshot = await metricsService.getSnapshot();
      const llmStats = await metricsService.getLlmStats();
      res.json({ snapshot, llmStats });
    } catch (error) {
      res.status(500).json({ error: '获取指标失败' });
    }
  });

  const server = createHttpServer(app);

  initWebSocket(server);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    const config = getConfig();
    console.log(`SkillMap server running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log(`LLM Provider: ${config.llm.provider}`);
    console.log(`Database: ${process.env.DB_HOST ? `PostgreSQL (${config.database.host})` : 'SQLite'}`);

    metricsService.startAutoSnapshot(60);
    alertService.startPeriodicCheck(60);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    metricsService.stopAutoSnapshot();
    alertService.stopPeriodicCheck();
    server.close(async () => {
      console.log('HTTP server closed');
      await closePool();
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
