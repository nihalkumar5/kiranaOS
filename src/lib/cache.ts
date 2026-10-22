// High-performance in-memory store cache for KiranaOS

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// Global cache map survives across hot reloads in development
const globalForCache = globalThis as unknown as {
  kiranaMemoryCache?: Map<string, CacheEntry<any>>;
};

const memoryCache = globalForCache.kiranaMemoryCache || new Map<string, CacheEntry<any>>();
if (process.env.NODE_ENV !== 'production') {
  globalForCache.kiranaMemoryCache = memoryCache;
}

/**
 * Get cached item if not expired
 */
export function getCached<T>(key: string, ttlMs = 120_000): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Store item in cache
 */
export function setCached<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Invalidate all cache entries matching prefix (e.g. `products:storeId`)
 */
export function invalidateCache(prefix: string): void {
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
