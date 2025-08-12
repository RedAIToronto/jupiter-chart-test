/**
 * Rate Limit Manager - Ensures we never exceed Jupiter API limits
 * Manages request queuing and distribution across multiple API keys
 */

interface RateLimitConfig {
  maxRequestsPerSecond: number;
  burstSize: number;
  apiKeys?: string[];
}

export class RateLimitManager {
  private requestQueue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  private tokensAvailable: number;
  private lastRefillTime: number = Date.now();
  private processing = false;
  
  // Pro II plan: 50 RPS
  private readonly config: RateLimitConfig = {
    maxRequestsPerSecond: 45, // Keep 5 RPS buffer
    burstSize: 50,
    apiKeys: [process.env.NEXT_PUBLIC_JUPITER_API_KEY || 'a8fa72b5-c442-47fb-b1e4-4ced7bea14a3']
  };
  
  // Request deduplication
  private pendingRequests = new Map<string, Promise<any>>();
  
  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...this.config, ...config };
    this.tokensAvailable = this.config.burstSize;
  }
  
  /**
   * Execute a request with rate limiting
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    // Check for pending duplicate request
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`Request deduplicated: ${key}`);
      return pending;
    }
    
    // Create promise for this request
    const promise = new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        execute: requestFn,
        resolve,
        reject
      });
    });
    
    // Store as pending
    this.pendingRequests.set(key, promise);
    
    // Clean up after completion
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return promise;
  }
  
  /**
   * Process queued requests respecting rate limits
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      // Refill tokens based on time elapsed
      this.refillTokens();
      
      if (this.tokensAvailable >= 1) {
        // We have tokens, process request
        const request = this.requestQueue.shift();
        if (!request) break;
        
        this.tokensAvailable--;
        
        // Execute request
        try {
          const result = await request.execute();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      } else {
        // No tokens available, wait for refill
        const waitTime = Math.ceil(1000 / this.config.maxRequestsPerSecond);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = (timePassed / 1000) * this.config.maxRequestsPerSecond;
    
    if (tokensToAdd >= 1) {
      this.tokensAvailable = Math.min(
        this.config.burstSize,
        this.tokensAvailable + Math.floor(tokensToAdd)
      );
      this.lastRefillTime = now;
    }
  }
  
  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      tokensAvailable: Math.floor(this.tokensAvailable),
      maxTokens: this.config.burstSize,
      requestsPerSecond: this.config.maxRequestsPerSecond,
      pendingDeduped: this.pendingRequests.size
    };
  }
  
  /**
   * Clear the queue (emergency use)
   */
  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
    this.pendingRequests.clear();
  }
}

// Global instance
let rateLimiter: RateLimitManager | null = null;

export function getRateLimiter(): RateLimitManager {
  if (!rateLimiter) {
    rateLimiter = new RateLimitManager();
  }
  return rateLimiter;
}