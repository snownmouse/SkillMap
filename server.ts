import { createServer as createHttpServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const { createApp, registerMiddleware, registerRoutes, setupDevServer, setupProdServer } = await import('./src/server/app');
  const app = createApp();

  const { getConfig } = await import('./src/server/config');
  const { initDatabase, closePool } = await import('./src/server/database');
  const { initWebSocket, closeWebSocket } = await import('./src/server/websocket');
  const { metricsService } = await import('./src/server/middleware/metrics');
  const { alertService } = await import('./src/server/services/AlertService');
  const { failStaleTasks } = await import('./src/server/services/TaskRecoveryService');
  const { startTaskWorker, stopTaskWorker, getTaskQueueMode } = await import('./src/server/services/TaskQueueService');
  const { runQueuedTask } = await import('./src/server/controllers/treeController');
  const { startTaskRetryScheduler, stopTaskRetryScheduler } = await import('./src/server/services/TaskSchedulerService');

  const config = getConfig();
  const PORT = config.port;

  await initDatabase();
  await failStaleTasks();
  await registerMiddleware(app);
  await registerRoutes(app);

  const server = createHttpServer(app);
  initWebSocket(server);

  if (process.env.NODE_ENV !== 'production') {
    await setupDevServer(app);
  } else {
    setupProdServer(app);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SkillMap server running on http://localhost:${PORT}`);
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log(`LLM Provider: ${config.llm.provider}`);
    console.log(`Database: ${process.env.DB_HOST ? `PostgreSQL (${config.database.host})` : 'SQLite'}`);

    metricsService.startAutoSnapshot(60);
    alertService.startPeriodicCheck(60);

    if (getTaskQueueMode() === 'redis' && process.env.DISABLE_TASK_WORKER !== 'true') {
      startTaskWorker(runQueuedTask).catch(() => {});
    }
    if (getTaskQueueMode() === 'redis') {
      startTaskRetryScheduler();
    }
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    metricsService.stopAutoSnapshot();
    alertService.stopPeriodicCheck();
    stopTaskRetryScheduler();
    await stopTaskWorker();
    closeWebSocket();
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
