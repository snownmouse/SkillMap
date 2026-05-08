import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;

type CacheValue = { v: any; e?: number };
const memoryCache = new Map<string, CacheValue>();

function nowMs() {
  return Date.now();
}

async function getClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = createClient({ url });
    client.on('error', () => {});
  }
  if (!connectPromise) {
    connectPromise = client.connect().catch(() => {}).then(() => {});
  }
  await connectPromise;
  return client;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const c = await getClient();
  if (!c) {
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.e && item.e <= nowMs()) {
      memoryCache.delete(key);
      return null;
    }
    return item.v as T;
  }
  try {
    const raw = await c.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: any, ttlSeconds: number): Promise<void> {
  const c = await getClient();
  if (!c) {
    const expiresAt = ttlSeconds > 0 ? nowMs() + ttlSeconds * 1000 : undefined;
    memoryCache.set(key, { v: value, e: expiresAt });
    return;
  }
  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await c.set(key, payload, { EX: ttlSeconds });
      return;
    }
    await c.set(key, payload);
  } catch {
  }
}

export async function cacheIncr(key: string, ttlSeconds: number): Promise<void> {
  const c = await getClient();
  if (!c) return;
  try {
    const n = await c.incr(key);
    if (n === 1 && ttlSeconds > 0) {
      await c.expire(key, ttlSeconds);
    }
  } catch {
  }
}

