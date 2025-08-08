// Optimized API client with batching and caching
import { priceCache, chartCache, quoteCache } from './cache-layer';
import { getRPCClient } from './rpc-client';

interface BatchRequest {
  id: string;
  method: string;
  params: any;
}

interface TokenData {
  configAddress: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  tokensSold: number;
  progress: number;
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class OptimizedAPIClient {
  private batchQueue: Map<string, { request: BatchRequest; resolve: Function; reject: Function }> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private batchDelay: number = 10; // 10ms debounce
  private maxBatchSize: number = 50;
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || '/api';
  }

  // Get token data with caching
  async getTokenData(configAddress: string): Promise<TokenData> {
    // Check cache first
    const cached = priceCache.get<TokenData>(`data:${configAddress}`);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const data = await this.fetchTokenData(configAddress);
    
    // Cache the result
    priceCache.set(`data:${configAddress}`, data);
    
    return data;
  }

  // Batch get multiple tokens
  async getTokensData(configAddresses: string[]): Promise<Map<string, TokenData>> {
    const results = new Map<string, TokenData>();
    const toFetch: string[] = [];

    // Check cache for each token
    for (const address of configAddresses) {
      const cached = priceCache.get<TokenData>(`data:${address}`);
      if (cached) {
        results.set(address, cached);
      } else {
        toFetch.push(address);
      }
    }

    // Batch fetch missing data
    if (toFetch.length > 0) {
      const fetchedData = await this.batchFetchTokenData(toFetch);
      
      fetchedData.forEach((data, address) => {
        results.set(address, data);
        priceCache.set(`data:${address}`, data);
      });
    }

    return results;
  }

  // Get chart data with intelligent caching
  async getChartData(
    configAddress: string,
    interval: string = '1m',
    range: string = '24h'
  ): Promise<ChartData[]> {
    const cacheKey = `chart:${configAddress}:${interval}:${range}`;
    
    // Check cache
    const cached = chartCache.get<ChartData[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await fetch(
      `${this.apiUrl}/chart/${configAddress}?interval=${interval}&range=${range}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chart data: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache with appropriate TTL based on interval
    const ttl = this.getChartCacheTTL(interval);
    chartCache.set(cacheKey, data, ttl);
    
    return data;
  }

  // Get swap quote with caching
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage: number = 0.5
  ): Promise<any> {
    const cacheKey = `quote:${inputMint}:${outputMint}:${amount}:${slippage}`;
    
    // Check cache
    const cached = quoteCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // For now, just use Jupiter API for all quotes
    const quote = await this.getJupiterQuote(inputMint, outputMint, amount, slippage);

    // Cache the quote
    quoteCache.set(cacheKey, quote);
    
    return quote;
  }

  // Batch API requests for efficiency
  async batchRequest(request: BatchRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      this.batchQueue.set(request.id, { request, resolve, reject });
      
      // Debounce batch execution
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }
      
      this.batchTimer = setTimeout(() => {
        this.executeBatch();
      }, this.batchDelay);
      
      // Execute immediately if batch is full
      if (this.batchQueue.size >= this.maxBatchSize) {
        if (this.batchTimer) {
          clearTimeout(this.batchTimer);
        }
        this.executeBatch();
      }
    });
  }

  private async executeBatch(): Promise<void> {
    if (this.batchQueue.size === 0) return;
    
    const batch = Array.from(this.batchQueue.values());
    this.batchQueue.clear();
    
    try {
      const response = await fetch(`${this.apiUrl}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: batch.map(b => b.request)
        })
      });
      
      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.statusText}`);
      }
      
      const results = await response.json();
      
      // Resolve individual promises
      batch.forEach((item, index) => {
        if (results[index].error) {
          item.reject(new Error(results[index].error));
        } else {
          item.resolve(results[index].result);
        }
      });
    } catch (error) {
      // Reject all promises on error
      batch.forEach(item => item.reject(error));
    }
  }

  private async fetchTokenData(configAddress: string): Promise<TokenData> {
    // Use browser-safe RPC client
    const rpcClient = getRPCClient();
    
    const accountInfo = await rpcClient.getAccountInfo(configAddress);
    
    if (!accountInfo) {
      throw new Error('Config not found');
    }
    
    // Parse account data (simplified - implement actual parsing)
    const data = this.parseAccountData(accountInfo.data);
    
    return {
      configAddress,
      price: data.price,
      marketCap: data.marketCap,
      volume24h: data.volume24h,
      change24h: data.change24h,
      tokensSold: data.tokensSold,
      progress: data.progress
    };
  }

  private async batchFetchTokenData(configAddresses: string[]): Promise<Map<string, TokenData>> {
    const rpcClient = getRPCClient();
    const results = new Map<string, TokenData>();
    
    // Batch fetch all accounts at once
    const accountsInfo = await rpcClient.getMultipleAccountsInfo(configAddresses);
    
    // Process results
    configAddresses.forEach((address, index) => {
      const accountInfo = accountsInfo[index];
      if (accountInfo) {
        const data = this.parseAccountData(accountInfo.data);
        results.set(address, {
          configAddress: address,
          price: data.price,
          marketCap: data.marketCap,
          volume24h: data.volume24h,
          change24h: data.change24h,
          tokensSold: data.tokensSold,
          progress: data.progress
        });
      }
    });
    
    return results;
  }

  private parseAccountData(data: Buffer): any {
    // Implement actual parsing logic based on Meteora DBC layout
    // This is a placeholder
    return {
      price: Math.random() * 0.01,
      marketCap: Math.random() * 100000,
      volume24h: Math.random() * 10000,
      change24h: (Math.random() - 0.5) * 20,
      tokensSold: Math.random() * 1000000,
      progress: Math.random() * 100
    };
  }

  private async checkIfDBCToken(inputMint: string, outputMint: string, connection: any): Promise<boolean> {
    // Check if either token is a DBC token
    // Implement actual logic to check DBC program accounts
    return false;
  }

  private async getDBCQuote(inputMint: string, outputMint: string, amount: number, connection: any): Promise<any> {
    // Implement DBC-specific quote logic
    return {
      inputMint,
      outputMint,
      inAmount: amount,
      outAmount: amount * 0.99, // Simplified
      priceImpact: 0.5,
      fee: amount * 0.01
    };
  }

  private async getJupiterQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippage: number
  ): Promise<any> {
    const params = new URLSearchParams({
      endpoint: 'v6/quote',
      inputMint,
      outputMint,
      amount: amount.toString(),
      slippageBps: (slippage * 100).toString()
    });
    
    // Use our proxy which handles API key server-side
    const response = await fetch(`/api/jupiter?${params}`);
    
    if (!response.ok) {
      throw new Error('Failed to get Jupiter quote');
    }
    
    return response.json();
  }

  private getChartCacheTTL(interval: string): number {
    // Return appropriate TTL based on interval
    switch (interval) {
      case '1m':
        return 5000; // 5 seconds
      case '5m':
        return 30000; // 30 seconds
      case '15m':
        return 60000; // 1 minute
      case '1h':
        return 300000; // 5 minutes
      case '1d':
        return 3600000; // 1 hour
      default:
        return 10000; // 10 seconds
    }
  }
}

// Singleton instance
let apiClient: OptimizedAPIClient | null = null;

export function getAPIClient(): OptimizedAPIClient {
  if (!apiClient) {
    apiClient = new OptimizedAPIClient();
  }
  return apiClient;
}