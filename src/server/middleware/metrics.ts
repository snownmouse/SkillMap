import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/MetricsService';

export const metricsService = new MetricsService();

interface MetricEntry {
  timestamp: number;
  duration: number;
  statusCode: number;
  path: string;
  method: string;
}

const recentMetrics: MetricEntry[] = [];
const MAX_METRICS = 10000;

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const entry: MetricEntry = {
      timestamp: startTime,
      duration,
      statusCode: res.statusCode,
      path: req.route?.path || req.path,
      method: req.method,
    };

    recentMetrics.push(entry);
    if (recentMetrics.length > MAX_METRICS) {
      recentMetrics.shift();
    }
  });

  next();
}

export function getRecentMetrics(minutes = 5): MetricEntry[] {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return recentMetrics.filter(m => m.timestamp >= cutoff);
}

export function getMetricsSummary(minutes = 5) {
  const metrics = getRecentMetrics(minutes);
  if (metrics.length === 0) {
    return { total: 0, avgDuration: 0, errorRate: 0, p95: 0, p99: 0 };
  }

  const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
  const errors = metrics.filter(m => m.statusCode >= 500).length;

  return {
    total: metrics.length,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
    errorRate: Math.round((errors / metrics.length) * 10000) / 100,
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
    requestsPerMinute: Math.round(metrics.length / minutes * 100) / 100,
  };
}
