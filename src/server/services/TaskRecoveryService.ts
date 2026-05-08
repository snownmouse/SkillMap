import { getDb } from '../database';
import { logger } from '../utils/logger';

export async function failStaleTasks(): Promise<void> {
  const minutes = Math.max(1, parseInt(process.env.TASK_STALE_MINUTES || '30'));
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const nowStr = new Date().toISOString();
  const pool = getDb();
  try {
    const res = await pool.query(
      `UPDATE tasks
       SET status = 'failed', error = $1, updated_at = $2
       WHERE status IN ('pending','in_progress') AND updated_at < $3`,
      ['任务因服务重启或中断失败，请重新发起', nowStr, cutoff]
    );
    if ((res?.rowCount || 0) > 0) {
      logger.warn('已标记过期任务为失败', { count: res.rowCount, cutoff });
    }
  } catch (e) {
    logger.warn('任务恢复检查失败', { error: (e as Error).message });
  }
}

