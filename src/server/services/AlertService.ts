import { getPool } from '../database';
import { getMetricsSummary } from '../middleware/metrics';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface AlertRule {
  name: string;
  check: () => Promise<boolean>;
  message: string;
  cooldownMs: number;
  lastTriggered: number;
}

const alertRules: AlertRule[] = [
  {
    name: 'high_error_rate',
    check: async () => {
      const summary = getMetricsSummary(5);
      return summary.errorRate > 5;
    },
    message: 'API 错误率超过 5%',
    cooldownMs: 5 * 60 * 1000,
    lastTriggered: 0,
  },
  {
    name: 'slow_response',
    check: async () => {
      const summary = getMetricsSummary(5);
      return summary.p95 > 10000;
    },
    message: 'API P95 响应时间超过 10 秒',
    cooldownMs: 10 * 60 * 1000,
    lastTriggered: 0,
  },
  {
    name: 'llm_high_failure',
    check: async () => {
      try {
        const pool = getPool();
        const result = await pool.query(
          `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE NOT success) as failures
           FROM llm_logs
           WHERE created_at > NOW() - INTERVAL '5 minutes'`
        );
        const total = parseInt(result.rows[0]?.total || '0');
        const failures = parseInt(result.rows[0]?.failures || '0');
        return total > 0 && (failures / total) > 0.3;
      } catch {
        return false;
      }
    },
    message: 'LLM 调用失败率超过 30%（最近5分钟）',
    cooldownMs: 5 * 60 * 1000,
    lastTriggered: 0,
  },
  {
    name: 'db_connection_pool_exhausted',
    check: async () => {
      try {
        const pool = getPool();
        return pool.waitingCount > 5;
      } catch {
        return false;
      }
    },
    message: '数据库连接池等待数超过 5',
    cooldownMs: 2 * 60 * 1000,
    lastTriggered: 0,
  },
];

class AlertService {
  private checkInterval: NodeJS.Timeout | null = null;

  startPeriodicCheck(intervalSeconds = 60) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.runChecks().catch(err => {
        logger.error('AlertService 检查失败', err);
      });
    }, intervalSeconds * 1000);
  }

  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async runChecks() {
    const now = Date.now();

    for (const rule of alertRules) {
      try {
        const triggered = await rule.check();

        if (triggered && now - rule.lastTriggered > rule.cooldownMs) {
          rule.lastTriggered = now;
          this.notify(rule.name, rule.message);
        }
      } catch (err) {
        logger.error(`AlertService 规则检查失败: ${rule.name}`, err);
      }
    }
  }

  private notify(ruleName: string, message: string) {
    logger.error(`[ALERT] ${ruleName}: ${message}`);

    this.logAlert(ruleName, message).catch(() => {});
  }

  private async logAlert(ruleName: string, message: string) {
    try {
      const pool = getPool();
      const id = uuidv4();
      const nowStr = new Date().toISOString();
      await pool.query(
        `INSERT INTO logs (id, level, service, event, message, created_at)
         VALUES ($1, 'error', 'alert', $2, $3, $4)`,
        [id, ruleName, message, nowStr]
      );
    } catch {
      logger.warn('AlertService 写入数据库失败');
    }
  }
}

export const alertService = new AlertService();
