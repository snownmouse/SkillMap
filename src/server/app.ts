import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProductionLike = nodeEnv === 'production' || nodeEnv === 'staging';
  if (isProductionLike && process.env.ALLOW_LEGACY_DEFAULT_USER === 'true') {
    throw new Error('production/staging 禁止启用 ALLOW_LEGACY_DEFAULT_USER');
  }
  const rawOrigins = (process.env.CORS_ORIGIN || '').trim();
  const originList = rawOrigins
    ? rawOrigins.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  if (isProductionLike && originList.length === 0) {
    throw new Error('production/staging 必须显式配置 CORS_ORIGIN（逗号分隔的允许来源列表）');
  }

  const allowAll = originList.includes('*');
  const corsOptions: cors.CorsOptions = {
    origin: allowAll
      ? '*'
      : (origin, cb) => {
          if (!origin) return cb(null, true);
          if (originList.length === 0) return cb(null, true);
          if (originList.includes(origin)) return cb(null, true);
          return cb(null, false);
        },
    credentials: !allowAll,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
  };

  app.use(cors(corsOptions));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(compression());

  return app;
}

export async function registerMiddleware(app: express.Express) {
  const { securityHeaders, sanitizeInput, bodySizeLimit } = await import('./middleware/security');
  const { requestTracer } = await import('./middleware/requestTracer');
  const { metricsMiddleware } = await import('./middleware/metrics');

  app.use(securityHeaders);
  app.use(sanitizeInput);
  app.use(requestTracer);
  app.use(metricsMiddleware);

  app.use('/api/auth', bodySizeLimit(16 * 1024));
  app.use('/api/careers', bodySizeLimit(8 * 1024));
  app.use('/api/planning', bodySizeLimit(8 * 1024));
  app.use('/api/goals', bodySizeLimit(8 * 1024));
  app.use('/api/trees', bodySizeLimit(5 * 1024 * 1024));
}

export async function registerRoutes(app: express.Express) {
  const { treeRouter } = await import('./routes/tree');
  const { chatRouter } = await import('./routes/chat');
  const { authRouter } = await import('./routes/auth');
  const { careerRouter } = await import('./routes/career');
  const { planningRouter } = await import('./routes/planning');
  const { debugRouter } = await import('./routes/debug');
  const { goalsRouter } = await import('./routes/goals');
  const { optionalAuth } = await import('./controllers/authController');
  const { treeController } = await import('./controllers/treeController');
  const { llmRateLimiter } = await import('./middleware/llmRateLimit');
  const { metricsService } = await import('./middleware/metrics');

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    app.use('/api/debug', optionalAuth, debugRouter);
  }

  app.get('/api/tasks/:taskId', optionalAuth, treeController.getTaskStatus);
  app.post('/api/tasks/:taskId/cancel', optionalAuth, treeController.cancelTask);

  if (isProduction) {
    const { rateLimit } = await import('./middleware/security');
    app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 30 }), authRouter);
    app.use('/api/careers', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }), optionalAuth, careerRouter);
    app.use('/api/planning', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }), optionalAuth, planningRouter);
    app.use('/api/goals', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }), optionalAuth, goalsRouter);
    app.use('/api/trees/:treeId/chat', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }), llmRateLimiter, optionalAuth, chatRouter);
    app.use('/api/trees', rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }), optionalAuth, treeRouter);
  } else {
    app.use('/api/auth', authRouter);
    app.use('/api/careers', optionalAuth, careerRouter);
    app.use('/api/planning', optionalAuth, planningRouter);
    app.use('/api/goals', optionalAuth, goalsRouter);
    app.use('/api/trees/:treeId/chat', llmRateLimiter, optionalAuth, chatRouter);
    app.use('/api/trees', optionalAuth, treeRouter);
  }

  app.get('/api/health', async (_req, res) => {
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

  app.get('/api/metrics', async (_req, res) => {
    try {
      const snapshot = await metricsService.getSnapshot();
      const llmStats = await metricsService.getLlmStats();
      res.json({ snapshot, llmStats });
    } catch {
      res.status(500).json({ error: '获取指标失败' });
    }
  });

  const { errorHandler } = await import('./middleware/errorHandler');
  app.use(errorHandler);
}

export function setupDevServer(app: express.Express) {
  const vitePromise = import('vite').then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    return vite;
  });
  return vitePromise;
}

export function setupProdServer(app: express.Express) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));

  const indexPath = path.join(distPath, 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const ssrEnabled = process.env.SSR === 'true';

  app.get('*', async (req, res) => {
    if (!ssrEnabled) {
      res.sendFile(indexPath);
      return;
    }
    try {
      const { render } = await import('../entry-server');
      const { appHtml } = render(req.originalUrl || req.url || '/');
      const html = indexHtml.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch {
      res.sendFile(indexPath);
    }
  });
}
