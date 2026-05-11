import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;
let pubClient: RedisClientType | null = null;
let pubConnectPromise: Promise<void> | null = null;
let subClient: RedisClientType | null = null;
let subConnectPromise: Promise<void> | null = null;

type CacheValue = { v: any; e?: number };
export const memoryCache = new Map<string, CacheValue>();

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

export async function redisSendCommand(args: string[]): Promise<any | null> {
  const c = await getClient();
  if (!c) return null;
  try {
    return await (c as any).sendCommand(args);
  } catch {
    return null;
  }
}

async function getPubClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!pubClient) {
    pubClient = createClient({ url });
    pubClient.on('error', () => {});
  }
  if (!pubConnectPromise) {
    pubConnectPromise = pubClient.connect().catch(() => {}).then(() => {});
  }
  await pubConnectPromise;
  return pubClient;
}

async function getSubClient(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!subClient) {
    subClient = createClient({ url });
    subClient.on('error', () => {});
  }
  if (!subConnectPromise) {
    subConnectPromise = subClient.connect().catch(() => {}).then(() => {});
  }
  await subConnectPromise;
  return subClient;
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

export async function rateLimitIncr(key: string, ttlSeconds: number): Promise<number | null> {
  const c = await getClient();
  if (!c) return null;
  try {
    const n = await c.incr(key);
    if (n === 1 && ttlSeconds > 0) {
      await c.expire(key, ttlSeconds);
    }
    return n;
  } catch {
    return null;
  }
}

export async function pubsubPublish(channel: string, message: string): Promise<void> {
  const c = await getPubClient();
  if (!c) return;
  try {
    await c.publish(channel, message);
  } catch {
  }
}

export async function pubsubSubscribe(channel: string, onMessage: (message: string) => void): Promise<(() => Promise<void>) | null> {
  const c = await getSubClient();
  if (!c) return null;
  try {
    await c.subscribe(channel, (message: string) => {
      onMessage(message);
    });
    return async () => {
      try {
        await c.unsubscribe(channel);
      } catch {
      }
    };
  } catch {
    return null;
  }
}
