import { getPool } from '../database';
import { sql, generateId } from '../database/sqlBuilder';

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
  private snapshotInterval: NodeJS.Timeout | null = null;

  constructor() {}

  async getSnapshot(): Promise<MetricsSnapshot> {
    const pool = getPool();

    const [treesRes, usersRes, chatsRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM trees'),
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM chat_messages'),
    ]);

    const totalTrees = parseInt(treesRes.rows[0]?.count || '0');
    const totalUsers = parseInt(usersRes.rows[0]?.count || '0');
    const totalChats = parseInt(chatsRes.rows[0]?.count || '0');

    let llmTotal = 0;
    let llmSuccessful = 0;
    let avgResponseTime = 0;
    let dbSizeMB = 0;

    try {
      const llmQuery = `SELECT COUNT(*) as total, ${sql.countFilter('success')} as successful FROM llm_logs WHERE created_at > ${sql.interval(24)}`;
      const llmRes = await pool.query(llmQuery);
      llmTotal = parseInt(llmRes.rows[0]?.total || '0');
      llmSuccessful = parseInt(llmRes.rows[0]?.successful || '0');

      const responseQuery = `SELECT ${sql.coalesce(['AVG(latency_ms)'], '0')} as avg_latency FROM llm_logs WHERE created_at > ${sql.interval(24)}`;
      const responseRes = await pool.query(responseQuery);
      avgResponseTime = parseFloat(responseRes.rows[0]?.avg_latency || '0');

      if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
        const dbSizeRes = await pool.query('SELECT pg_database_size(current_database()) as size');
        dbSizeMB = Math.round(parseInt(dbSizeRes.rows[0]?.size || '0') / (1024 * 1024) * 100) / 100;
      }
    } catch {
    }

    return {
      timestamp: new Date().toISOString(),
      totalTrees,
      totalUsers,
      totalChats,
      llmCalls24h: llmTotal,
      llmSuccessRate: llmTotal > 0 ? Math.round((llmSuccessful / llmTotal) * 100) : 100,
      avgResponseTime: Math.round(avgResponseTime),
      dbSizeMB,
    };
  }

  async takeSnapshot(): Promise<void> {
    const pool = getPool();
    const snapshot = await this.getSnapshot();

    await pool.query(
      `INSERT INTO metrics_snapshots (id, timestamp, data) VALUES ('${generateId()}', $1, $2)`,
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
    const pool = getPool();

    const query = `SELECT data FROM metrics_snapshots WHERE timestamp > ${sql.interval(hours)} ORDER BY timestamp ASC`;
    const result = await pool.query(query);
    return result.rows.map((row: any) => typeof row.data === 'string' ? JSON.parse(row.data) : row.data);
  }

  async getLlmStats(hours = 24) {
    const pool = getPool();

    const query = `SELECT provider, model, COUNT(*) as total_calls, ${sql.countFilter('success')} as successful_calls, AVG(latency_ms) as avg_latency, SUM(prompt_tokens) as total_prompt_tokens, SUM(completion_tokens) as total_completion_tokens, SUM(total_tokens) as total_tokens FROM llm_logs WHERE created_at > ${sql.interval(hours)} GROUP BY provider, model`;
    const result = await pool.query(query);
    return result.rows;
  }
}