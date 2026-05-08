import { redisSendCommand } from './RedisService';
import { logger } from '../utils/logger';

type QueueMode = 'inline' | 'redis';

const STREAM_KEY = 'skillmap:task_queue';
const GROUP = 'skillmap';
const CONSUMER = `c_${Math.random().toString(36).substring(2)}_${Date.now().toString(36)}`;

let workerStop = false;

export function getTaskQueueMode(): QueueMode {
  const mode = (process.env.TASK_QUEUE_MODE || '').trim().toLowerCase();
  if (mode === 'inline' || mode === 'redis') return mode;
  return process.env.REDIS_URL ? 'redis' : 'inline';
}

async function ensureGroup(): Promise<boolean> {
  const enabled = getTaskQueueMode() === 'redis';
  if (!enabled) return false;
  const created = await redisSendCommand(['XGROUP', 'CREATE', STREAM_KEY, GROUP, '0', 'MKSTREAM']);
  if (created !== null) return true;
  const info = await redisSendCommand(['XINFO', 'GROUPS', STREAM_KEY]);
  if (info !== null) return true;
  return false;
}

export async function enqueueTask(taskId: string): Promise<boolean> {
  if (getTaskQueueMode() !== 'redis') return false;
  const ok = await ensureGroup();
  if (!ok) return false;
  const res = await redisSendCommand(['XADD', STREAM_KEY, '*', 'taskId', taskId]);
  return res !== null;
}

async function readNext(batch: number): Promise<Array<{ id: string; taskId: string }> | null> {
  const data = await redisSendCommand([
    'XREADGROUP',
    'GROUP', GROUP, CONSUMER,
    'COUNT', String(batch),
    'BLOCK', '5000',
    'STREAMS', STREAM_KEY, '>'
  ]);
  if (!data) return null;

  const out: Array<{ id: string; taskId: string }> = [];
  try {
    const streams = data as any[];
    for (const s of streams) {
      const entries = s?.[1] as any[] | undefined;
      if (!entries) continue;
      for (const e of entries) {
        const id = String(e?.[0] || '');
        const kv = e?.[1] as any[] | undefined;
        if (!id || !Array.isArray(kv)) continue;
        for (let i = 0; i < kv.length - 1; i += 2) {
          if (String(kv[i]) === 'taskId') {
            const taskId = String(kv[i + 1] || '');
            if (taskId) out.push({ id, taskId });
          }
        }
      }
    }
  } catch {
    return null;
  }
  return out;
}

async function autoClaimPending(minIdleMs: number, count: number): Promise<Array<{ id: string; taskId: string }> | null> {
  const data = await redisSendCommand([
    'XAUTOCLAIM', STREAM_KEY, GROUP, CONSUMER,
    String(minIdleMs),
    '0-0',
    'COUNT', String(count),
  ]);
  if (!data) return null;
  const out: Array<{ id: string; taskId: string }> = [];
  try {
    const entries = (data as any[])?.[1] as any[] | undefined;
    if (!entries) return out;
    for (const e of entries) {
      const id = String(e?.[0] || '');
      const kv = e?.[1] as any[] | undefined;
      if (!id || !Array.isArray(kv)) continue;
      for (let i = 0; i < kv.length - 1; i += 2) {
        if (String(kv[i]) === 'taskId') {
          const taskId = String(kv[i + 1] || '');
          if (taskId) out.push({ id, taskId });
        }
      }
    }
  } catch {
    return null;
  }
  return out;
}

export async function startTaskWorker(handler: (taskId: string) => Promise<void>) {
  if (getTaskQueueMode() !== 'redis') return;
  const ok = await ensureGroup();
  if (!ok) return;

  workerStop = false;
  logger.info('任务队列 worker 启动', { stream: STREAM_KEY, group: GROUP, consumer: CONSUMER });

  const batch = Math.max(1, parseInt(process.env.TASK_QUEUE_BATCH || '5'));
  const claimIdleMs = Math.max(1000, parseInt(process.env.TASK_QUEUE_CLAIM_IDLE_MS || '60000'));
  const claimCount = Math.max(1, parseInt(process.env.TASK_QUEUE_CLAIM_COUNT || '10'));

  while (!workerStop) {
    try {
      const claimed = await autoClaimPending(claimIdleMs, claimCount);
      const items = (claimed && claimed.length > 0) ? claimed : (await readNext(batch));
      if (!items || items.length === 0) continue;

      for (const item of items) {
        if (workerStop) break;
        try {
          await handler(item.taskId);
          await redisSendCommand(['XACK', STREAM_KEY, GROUP, item.id]);
        } catch (e) {
          logger.warn('任务队列处理失败', { taskId: item.taskId, error: (e as Error).message });
        }
      }
    } catch (e) {
      logger.warn('任务队列读取失败', { error: (e as Error).message });
    }
  }
}

export async function stopTaskWorker() {
  workerStop = true;
}

