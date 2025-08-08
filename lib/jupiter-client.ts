/**
 * Scalable Jupiter API Client
 * Handles authentication, rate limiting, caching, and fallbacks
 */

interface JupiterConfig {
  apiKey?: string;
  useLiteEndpoints?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  retryOnRateLimit?: boolean;
  maxRetries?: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class JupiterClient {
  private config: Required<JupiterConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimitBackoff: Map<string, number> = new Map();
  
  constructor(config: JupiterConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.NEXT_PUBLIC_JUPITER_API_KEY || '',
      useLiteEndpoints: config.useLiteEndpoints ?? true, // Default to Lite for Flex plans
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL ?? 5000, // 5 seconds default
      retryOnRateLimit: config.retryOnRateLimit ?? true,
      maxRetries: config.maxRetries ?? 3,
    };
    
    // Clean cache periodically
    if (this.config.cacheEnabled) {
      setInterval(() => this.cleanCache(), 60000);
    }
  }
  
  /**
   * Get SOL price (using v3 API)
   */
  async getSolPrice(): Promise<number> {
    try {
      const data = await this.getPrices(['So11111111111111111111111111111111111111112']);
      return data['So11111111111111111111111111111111111111112']?.price || 165;
    } catch (error) {
      console.warn('Failed to fetch SOL price, using fallback:', error);
      return 165; // Fallback price
    }
  }
  
  /**
   * Get token prices (v3 API)
   */
  async getPrices(mints: string[]): Promise<Record<string, { price: number }>> {
    const cacheKey = `prices:${mints.join(',')}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request('/api/jupiter', {
        params: {
          endpoint: 'price/v3',
          ids: mints.join(',')
        }
      });
      
      const result = response?.data || {};
      this.setCache(cacheKey, result, 5000); // Cache for 5 seconds
      return result;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      // Return empty object or throw based on requirements
      return {};
    }
  }
  
  /**
   * Get swap quote
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
    onlyDirectRoutes?: boolean;
    maxAccounts?: number;
  }): Promise<any> {
    const cacheKey = `quote:${JSON.stringify(params)}`;
    
    // Check cache for recent quotes
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const queryParams = {
      endpoint: 'v6/quote',
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount.toString(),
      slippageBps: (params.slippageBps || 50).toString(),
      ...(params.onlyDirectRoutes && { onlyDirectRoutes: 'true' }),
      ...(params.maxAccounts && { maxAccounts: params.maxAccounts.toString() })
    };
    
    try {
      const response = await this.request('/api/jupiter', { params: queryParams });
      
      if (response?.error) {
        throw new Error(response.error);
      }
      
      this.setCache(cacheKey, response, 2000); // Cache for 2 seconds
      return response;
    } catch (error) {
      // Try fallback to direct calculation for DBC tokens
      if (this.isDBCToken(params.inputMint) || this.isDBCToken(params.outputMint)) {
        return this.calculateDBCQuote(params);
      }
      throw error;
    }
  }
  
  /**
   * Get swap transaction
   */
  async getSwapTransaction(params: {
    quoteResponse: any;
    userPublicKey: string;
    wrapAndUnwrapSol?: boolean;
    dynamicComputeUnitLimit?: boolean;
    prioritizationFeeLamports?: string | number;
  }): Promise<{ swapTransaction: string }> {
    const response = await this.request('/api/jupiter', {
      method: 'POST',
      body: {
        endpoint: 'v6/swap',
        ...params,
        prioritizationFeeLamports: params.prioritizationFeeLamports || 'auto'
      }
    });
    
    if (!response?.swapTransaction) {
      throw new Error('Failed to get swap transaction');
    }
    
    return response;
  }
  
  /**
   * Get token list
   */
  async getTokenList(): Promise<any[]> {
    const cacheKey = 'token-list';
    
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const response = await this.request('/api/jupiter', {
        params: { endpoint: 'tokens' }
      });
      
      this.setCache(cacheKey, response, 300000); // Cache for 5 minutes
      return response;
    } catch (error) {
      console.error('Failed to fetch token list:', error);
      return [];
    }
  }
  
  /**
   * Main request handler with retry logic and rate limit handling
   */
  private async request(
    url: string,
    options: {
      method?: string;
      params?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<any> {
    const { method = 'GET', params, body } = options;
    
    // Check rate limit backoff
    const backoffKey = `${method}:${url}`;
    const backoffUntil = this.rateLimitBackoff.get(backoffKey);
    if (backoffUntil && Date.now() < backoffUntil) {
      const waitTime = backoffUntil - Date.now();
      if (this.config.retryOnRateLimit) {
        await this.sleep(waitTime);
      } else {
        throw new Error(`Rate limited. Retry after ${Math.ceil(waitTime / 1000)} seconds`);
      }
    }
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const requestUrl = params 
          ? `${url}?${new URLSearchParams(params).toString()}`
          : url;
        
        const response = await fetch(requestUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          ...(body && { body: JSON.stringify(body) })
        });
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '2');
          const backoffTime = Date.now() + (retryAfter * 1000 * Math.pow(2, attempt));
          this.rateLimitBackoff.set(backoffKey, backoffTime);
          
          if (this.config.retryOnRateLimit && attempt < this.config.maxRetries - 1) {
            await this.sleep(retryAfter * 1000 * Math.pow(2, attempt));
            continue;
          } else {
            throw new Error('Rate limited');
          }
        }
        
        // Clear rate limit backoff on success
        this.rateLimitBackoff.delete(backoffKey);
        
        const data = await response.json();
        
        if (!response.ok && response.status !== 429) {
          throw new Error(data?.error || `Request failed with status ${response.status}`);
        }
        
        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Exponential backoff for network errors
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    throw lastError || new Error('Request failed after retries');
  }
  
  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    if (!this.config.cacheEnabled) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCache(key: string, data: any, ttl?: number): void {
    if (!this.config.cacheEnabled) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL
    });
  }
  
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Helper methods
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private isDBCToken(mint: string): boolean {
    // Add logic to check if token is a DBC token
    // This is a placeholder - implement actual check
    return false;
  }
  
  private calculateDBCQuote(params: any): any {
    // Implement DBC-specific quote calculation
    // This is a placeholder for DBC bonding curve calculations
    return {
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      inAmount: params.amount,
      outAmount: Math.floor(params.amount * 0.99), // Simplified
      priceImpactPct: 0.5,
      marketInfos: []
    };
  }
}

// Singleton instance
let jupiterClient: JupiterClient | null = null;

/**
 * Get or create Jupiter client instance
 */
export function getJupiterClient(config?: JupiterConfig): JupiterClient {
  if (!jupiterClient) {
    jupiterClient = new JupiterClient(config);
  }
  return jupiterClient;
}

// Export types
export type { JupiterConfig };
export { JupiterClient };