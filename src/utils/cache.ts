class CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;

  constructor(data: T, expiry: number = 300000) { // 默认5分钟过期
    this.data = data;
    this.timestamp = Date.now();
    this.expiry = expiry;
  }

  isExpired(): boolean {
    return Date.now() - this.timestamp > this.expiry;
  }
}

export class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultExpiry: number;
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultExpiry: number = 300000, maxSize: number = 500) {
    this.defaultExpiry = defaultExpiry;
    this.maxSize = maxSize;
    this.startCleanup();
  }

  set<T>(key: string, data: T, expiry?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    this.cache.set(key, new CacheItem(data, expiry || this.defaultExpiry));
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.isExpired()) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (item.isExpired()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      for (const [key, item] of this.cache) {
        if (item.isExpired()) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

export const cache = new MemoryCache();

export function withCache<T>(key: string, fetcher: () => Promise<T>, expiry?: number): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached) {
    return Promise.resolve(cached);
  }

  return fetcher().then(data => {
    cache.set(key, data, expiry);
    return data;
  });
}
