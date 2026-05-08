import { getDb } from '../database';
import { enqueueTask, getTaskQueueMode } from './TaskQueueService';
import { logger } from '../utils/logger';

let timer: NodeJS.Timeout | null = null;

export function startTaskRetryScheduler() {
  if (getTaskQueueMode() !== 'redis') return;
  if (process.env.DISABLE_TASK_SCHEDULER === 'true') return;
  if (timer) return;

  const intervalMs = Math.max(1000, parseInt(process.env.TASK_SCHEDULER_INTERVAL_MS || '5000'));
  const batch = Math.max(1, parseInt(process.env.TASK_SCHEDULER_BATCH || '20'));

  timer = setInterval(() => {
    tick(batch).catch(() => {});
  }, intervalMs);

  tick(batch).catch(() => {});
}

export function stopTaskRetryScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

async function tick(batch: number) {
  const pool = getDb();
  const nowStr = new Date().toISOString();
  const res = await pool.query(
    `SELECT id FROM tasks
     WHERE status = 'pending'
       AND next_retry_at IS NOT NULL
       AND next_retry_at <= $1
       AND (lease_expires_at IS NULL OR lease_expires_at < $1)
     ORDER BY next_retry_at ASC
     LIMIT ${batch}`,
    [nowStr]
  );

  const ids = (res.rows || []).map((r: any) => String(r.id)).filter(Boolean);
  if (ids.length === 0) return;

  for (const id of ids) {
    const ok = await enqueueTask(id);
    if (!ok) continue;
    try {
      await pool.query('UPDATE tasks SET next_retry_at = NULL WHERE id = $1', [id]);
    } catch {
    }
  }

  logger.info('任务重试调度', { count: ids.length });
}

