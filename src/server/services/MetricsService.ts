import { getPool } from '../database';
import type pg from 'pg';

interface MetricsSnapshot {
  timestamp: string;
  totalTrees: number;
  totalUsers: number;
  totalChats: number;
  llmCalls24h: number;
  llmSuccessRate: number;
  avgResponseTime: number;
  dbSizeMB: number;
}

export class MetricsService {
  private pool: pg.Pool;
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor(pool?: pg.Pool) {
    this.pool = pool || getPool();
  }

  async getSnapshot(): Promise<MetricsSnapshot> {
    const [treesRes, usersRes, chatsRes, llmRes, responseRes, dbSizeRes] = await Promise.all([
      this.pool.query('SELECT COUNT(*) as count FROM trees'),
      this.pool.query('SELECT COUNT(*) as count FROM users'),
      this.pool.query('SELECT COUNT(*) as count FROM chat_messages'),
      this.pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE success) as successful
         FROM llm_logs
         WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      this.pool.query(
        `SELECT COALESCE(AVG(latency_ms), 0) as avg_latency
         FROM llm_logs
         WHERE created_at > NOW() - INTERVAL '24 hours'`
      ),
      this.pool.query('SELECT pg_database_size(current_database()) as size'),
    ]);

    const totalTrees = parseInt(treesRes.rows[0]?.count || '0');
    const totalUsers = parseInt(usersRes.rows[0]?.count || '0');
    const totalChats = parseInt(chatsRes.rows[0]?.count || '0');
    const llmTotal = parseInt(llmRes.rows[0]?.total || '0');
    const llmSuccessful = parseInt(llmRes.rows[0]?.successful || '0');
    const avgResponseTime = parseFloat(responseRes.rows[0]?.avg_latency || '0');
    const dbSizeBytes = parseInt(dbSizeRes.rows[0]?.size || '0');

    return {
      timestamp: new Date().toISOString(),
      totalTrees,
      totalUsers,
      totalChats,
      llmCalls24h: llmTotal,
      llmSuccessRate: llmTotal > 0 ? Math.round((llmSuccessful / llmTotal) * 100) : 100,
      avgResponseTime: Math.round(avgResponseTime),
      dbSizeMB: Math.round(dbSizeBytes / (1024 * 1024) * 100) / 100,
    };
  }

  async takeSnapshot(): Promise<void> {
    const snapshot = await this.getSnapshot();

    await this.pool.query(
      `INSERT INTO metrics_snapshots (id, timestamp, data)
       VALUES (gen_random_uuid()::text, $1, $2)`,
      [snapshot.timestamp, JSON.stringify(snapshot)]
    );
  }

  startAutoSnapshot(intervalMinutes = 60) {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }

    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot().catch(err => {
        console.error('[MetricsService] Auto-snapshot failed:', err);
      });
    }, intervalMinutes * 60 * 1000);
  }

  stopAutoSnapshot() {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
    }
  }

  async getHistoricalSnapshots(hours = 24): Promise<MetricsSnapshot[]> {
    const result = await this.pool.query(
      `SELECT data FROM metrics_snapshots
       WHERE timestamp > NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp ASC`,
    );
    return result.rows.map((row: any) => typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
  }

  async getLlmStats(hours = 24) {
    const result = await this.pool.query(
      `SELECT
        provider,
        model,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE success) as successful_calls,
        AVG(latency_ms) as avg_latency,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens
       FROM llm_logs
       WHERE created_at > NOW() - INTERVAL '${hours} hours'
       GROUP BY provider, model`,
    );
    return result.rows;
  }
}
