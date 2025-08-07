// Smart Cache Manager with Rate Limiting
import { TokenInfo, ChartResponse } from './jupiter-api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounts = new Map<string, number[]>(); // Track requests per minute
  private rateLimitBackoff = new Map<string, number>(); // Exponential backoff
  
  // Configuration
  private readonly MAX_REQUESTS_PER_MINUTE = 60;
  private readonly CACHE_TTL = {
    tokenInfo: 5000,      // 5 seconds for price data
    chartData: 10000,     // 10 seconds for chart data
    holders: 30000,       // 30 seconds for holder data
    transactions: 15000,  // 15 seconds for transactions
  };

  // Get data from cache or fetch
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5000
  ): Promise<T | null> {
    // Check if we're rate limited
    if (this.isRateLimited(key)) {
      console.warn(`Rate limited for ${key}, using stale cache or returning null`);
      const cached = this.cache.get(key);
      return cached ? cached.data : null;
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`Request already in flight for ${key}, waiting...`);
      return pending.promise;
    }

    // Create new request
    const requestPromise = this.executeFetch(key, fetcher, ttl);
    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: Date.now(),
    });

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async executeFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T | null> {
    try {
      // Track request for rate limiting
      this.trackRequest(key);

      // Apply backoff if needed
      const backoff = this.rateLimitBackoff.get(key) || 0;
      if (backoff > 0) {
        console.log(`Applying ${backoff}ms backoff for ${key}`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }

      // Fetch data
      const data = await fetcher();
      
      // Cache successful response
      if (data) {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });
        
        // Clear backoff on success
        this.rateLimitBackoff.delete(key);
      }

      return data;
    } catch (error: any) {
      console.error(`Error fetching ${key}:`, error);
      
      // Handle rate limit errors
      if (error.status === 429 || error.message?.includes('429')) {
        this.handleRateLimit(key);
      }
      
      // Return stale cache if available
      const cached = this.cache.get(key);
      if (cached) {
        console.log(`Returning stale cache for ${key} due to error`);
        return cached.data;
      }
      
      return null;
    }
  }

  private trackRequest(key: string) {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < 60000);
    recentRequests.push(now);
    
    this.requestCounts.set(key, recentRequests);
  }

  private isRateLimited(key: string): boolean {
    const requests = this.requestCounts.get(key) || [];
    const now = Date.now();
    const recentRequests = requests.filter(time => now - time < 60000);
    
    return recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE;
  }

  private handleRateLimit(key: string) {
    const currentBackoff = this.rateLimitBackoff.get(key) || 1000;
    const newBackoff = Math.min(currentBackoff * 2, 60000); // Max 1 minute
    
    console.warn(`Rate limited! Setting backoff for ${key} to ${newBackoff}ms`);
    this.rateLimitBackoff.set(key, newBackoff);
  }

  // Force refresh a specific key
  invalidate(key: string) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.requestCounts.clear();
    this.rateLimitBackoff.clear();
    this.rateLimitBackoff.clear();
  }

  // Get cache stats
  getStats() {
    const stats = {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      rateLimitedKeys: Array.from(this.rateLimitBackoff.keys()),
      requestCounts: {} as Record<string, number>,
    };

    for (const [key, requests] of this.requestCounts.entries()) {
      const now = Date.now();
      const recentRequests = requests.filter(time => now - time < 60000);
      stats.requestCounts[key] = recentRequests.length;
    }

    return stats;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Convenience functions for specific data types
export async function getCachedTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
  const { JupiterAPI } = await import('./jupiter-api');
  return cacheManager.get(
    `token:${tokenAddress}`,
    () => JupiterAPI.getTokenInfo(tokenAddress),
    5000 // 5 second cache
  );
}

export async function getCachedChartData(
  tokenAddress: string,
  interval: string = '15_MINUTE',
  type: 'price' | 'mcap' = 'price'
): Promise<ChartResponse | null> {
  const { JupiterAPI } = await import('./jupiter-api');
  return cacheManager.get(
    `chart:${tokenAddress}:${interval}:${type}`,
    () => JupiterAPI.getChartData(tokenAddress, interval, type),
    10000 // 10 second cache
  );
}

export async function getCachedHolders(tokenAddress: string) {
  const { JupiterAPI } = await import('./jupiter-api');
  return cacheManager.get(
    `holders:${tokenAddress}`,
    () => JupiterAPI.getTokenHolders(tokenAddress),
    30000 // 30 second cache
  );
}

export async function getCachedTransactions(tokenAddress: string, limit: number = 10) {
  const { JupiterAPI } = await import('./jupiter-api');
  return cacheManager.get(
    `txs:${tokenAddress}:${limit}`,
    () => JupiterAPI.getRecentTransactions(tokenAddress, limit),
    15000 // 15 second cache
  );
}

// Export cache clear function
export const clearCache = () => cacheManager.clear();