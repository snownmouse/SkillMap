import { Router, Request, Response } from 'express';
import { llmService } from '../llmService';
import { getPool } from '../database';
import { messageBufferService } from '../services';

export const debugRouter = Router();

debugRouter.get('/llm-logs', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = llmService.getRecentLogs(limit);
    const stats = llmService.getLogStats();
    res.json({ logs, stats });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 日志失败' });
  }
});

debugRouter.get('/llm-logs/db', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM llm_logs ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 日志失败' });
  }
});

debugRouter.get('/llm-stats', async (req: Request, res: Response) => {
  try {
    const stats = llmService.getLogStats();
    const pool = getPool();
    const dbStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE success) as success_count,
        COUNT(*) FILTER (WHERE NOT success) as fail_count,
        AVG(latency_ms) as avg_latency,
        SUM(total_tokens) as total_tokens,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens
      FROM llm_logs
    `);

    const byProviderResult = await pool.query(`
      SELECT provider, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(total_tokens) as total_tokens
      FROM llm_logs GROUP BY provider
    `);

    const byModelResult = await pool.query(`
      SELECT model, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(total_tokens) as total_tokens
      FROM llm_logs GROUP BY model
    `);

    res.json({
      memory: stats,
      database: dbStatsResult.rows[0],
      byProvider: byProviderResult.rows,
      byModel: byModelResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: '获取 LLM 统计失败' });
  }
});

debugRouter.get('/queue-status', (req: Request, res: Response) => {
  try {
    const status = messageBufferService.getStatus();
    res.json({ status });
  } catch (error) {
    res.status(500).json({ error: '获取队列状态失败' });
  }
});
