import dotenv from 'dotenv';

dotenv.config();

async function startWorker() {
  const { initDatabase, closePool } = await import('./src/server/database');
  const { startTaskWorker, stopTaskWorker, getTaskQueueMode } = await import('./src/server/services/TaskQueueService');
  const { startTaskRetryScheduler, stopTaskRetryScheduler } = await import('./src/server/services/TaskSchedulerService');
  const { failStaleTasks } = await import('./src/server/services/TaskRecoveryService');
  const { runQueuedTask } = await import('./src/server/controllers/treeController');

  await initDatabase();
  await failStaleTasks();

  if (getTaskQueueMode() !== 'redis') {
    // no-op: inline 模式下不需要独立 worker
  } else {
    startTaskRetryScheduler();
    startTaskWorker(runQueuedTask).catch(() => {});
  }

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    stopTaskRetryScheduler();
    await stopTaskWorker();
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorker().catch(err => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});

