import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { config } from './src/server/config';
import { getDb } from './src/server/database';
import { treeRouter } from './src/server/routes/tree';
import { chatRouter } from './src/server/routes/chat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = config.port;

  // 初始化数据库
  getDb();

  // 中间件
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '5mb', encoding: 'utf-8' }));
  app.use(express.urlencoded({ extended: true, encoding: 'utf-8' }));
  
  // 设置响应编码
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // API 路由
  app.use('/api/trees', treeRouter);
  app.use('/api/trees/:treeId/chat', chatRouter);

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite 静态资源/中间件
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

  // 错误处理
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillMap server running on http://localhost:${PORT}`);
    console.log(`LLM Provider: ${config.llm.provider}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
