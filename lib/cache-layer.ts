// Ultra-fast multi-layer cache implementation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export class UltraFastCache {
  private hotCache: Map<string, any> = new Map(); // L1: Ultra-hot data (<1ms)
  private memoryCache: Map<string, CacheEntry<any>> = new Map(); // L2: Memory cache
  private maxSize: number = 10000;
  private ttlMs: number = 1000; // 1 second default TTL
  private hotThreshold: number = 10; // Hits before promoting to hot cache

  constructor(options?: { maxSize?: number; ttlMs?: number }) {
    if (options?.maxSize) this.maxSize = options.maxSize;
    if (options?.ttlMs) this.ttlMs = options.ttlMs;
    
    // Cleanup expired entries every 10 seconds
    setInterval(() => this.cleanup(), 10000);
  }

  get<T>(key: string): T | null {
    // L1: Check hot cache first (instant)
    const hot = this.hotCache.get(key);
    if (hot !== undefined) {
      return hot;
    }

    // L2: Check memory cache
    const entry = this.memoryCache.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < this.ttlMs) {
        entry.hits++;
        
        // Promote to hot cache if frequently accessed
        if (entry.hits >= this.hotThreshold) {
          this.hotCache.set(key, entry.data);
        }
        
        return entry.data;
      } else {
        // Expired, remove it
        this.memoryCache.delete(key);
      }
    }

    return null;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      hits: 0
    };

    this.memoryCache.set(key, entry);

    // Enforce max size
    if (this.memoryCache.size > this.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
      this.hotCache.delete(firstKey);
    }
  }

  // Batch get for efficiency
  getMany<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  // Batch set
  setMany<T>(entries: Array<[string, T]>): void {
    for (const [key, value] of entries) {
      this.set(key, value);
    }
  }

  // Invalidate specific keys
  invalidate(keys: string | string[]): void {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    
    for (const key of keysArray) {
      this.memoryCache.delete(key);
      this.hotCache.delete(key);
    }
  }

  // Clear all caches
  clear(): void {
    this.hotCache.clear();
    this.memoryCache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      hotCacheSize: this.hotCache.size,
      memoryCacheSize: this.memoryCache.size,
      totalSize: this.hotCache.size + this.memoryCache.size
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttlMs) {
        expiredKeys.push(key);
      }
    });

    for (const key of expiredKeys) {
      this.memoryCache.delete(key);
      this.hotCache.delete(key);
    }
  }
}

// Singleton instance for global access
export const globalCache = new UltraFastCache({
  maxSize: 10000,
  ttlMs: 1000
});

// Specialized caches for different data types
export const priceCache = new UltraFastCache({
  maxSize: 1000,
  ttlMs: 500 // 500ms for prices
});

export const chartCache = new UltraFastCache({
  maxSize: 100,
  ttlMs: 10000 // 10 seconds for charts
});

export const quoteCache = new UltraFastCache({
  maxSize: 500,
  ttlMs: 2000 // 2 seconds for quotes
});