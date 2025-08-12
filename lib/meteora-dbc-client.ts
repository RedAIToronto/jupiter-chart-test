/**
 * Meteora Dynamic Bonding Curve Client
 * Fetches bonding curve completion percentage and other DBC-specific data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getJupiterClient } from './jupiter-client';

interface DBCTokenInfo {
  tokenAddress: string;
  configAddress: string;
  bondingCurvePercentage: number;
  tokensSold: number;
  totalSupply: number;
  currentPrice: number;
  marketCap: number;
  isComplete: boolean;
  migrationThreshold: number;
  dex: string;
  holders: number;
  volume24h: number;
  txns24h: number;
  priceChange24h: number;
  liquidity: number;
  createdAt?: string;
}

interface JupiterPoolInfo {
  baseAsset: {
    address: string;
    symbol: string;
    name: string;
    totalSupply: number;
    usdPrice?: number;
  };
  bondingCurve?: number;
  liquidity?: number;
  volume24h?: number;
  dex: string;
  poolInfo?: {
    tokensSold?: number;
    migrationThreshold?: number;
  };
}

export class MeteoraDBCClient {
  private jupiterClient: ReturnType<typeof getJupiterClient>;
  private cache: Map<string, { data: DBCTokenInfo; timestamp: number }> = new Map();
  private cacheTTL = 10000; // 10 seconds cache
  
  constructor() {
    this.jupiterClient = getJupiterClient();
  }
  
  /**
   * Get bonding curve completion percentage for a token
   */
  async getBondingCurvePercentage(tokenAddress: string): Promise<number> {
    const info = await this.getDBCTokenInfo(tokenAddress);
    return info?.bondingCurvePercentage ?? 0;
  }
  
  /**
   * Get complete DBC token information including bonding curve status
   */
  async getDBCTokenInfo(tokenAddress: string): Promise<DBCTokenInfo | null> {
    // Check cache
    const cached = this.cache.get(tokenAddress);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    try {
      // First, check Jupiter API for pool info
      const poolInfo = await this.fetchPoolInfo(tokenAddress);
      
      if (!poolInfo) {
        console.log('No pool info found for:', tokenAddress);
        return null;
      }
      
      // Check if it's a DBC token (Meteora, Moonshot, Pump.fun, Bags.fun, or other bonding curve platforms)
      const dbcDexes = ['met-dbc', 'moonshot', 'pump.fun', 'pumpfun', 'bags.fun', 'bagsfun'];
      const isDBC = dbcDexes.some(dex => poolInfo.dex?.toLowerCase().includes(dex.toLowerCase())) || 
                    typeof poolInfo.bondingCurve === 'number';
      
      if (!isDBC) {
        console.log('Not a DBC token:', poolInfo.dex);
        return null;
      }
      
      console.log(`Found DBC token on ${poolInfo.dex}:`, tokenAddress);
      
      // Calculate bonding curve percentage
      let bondingCurvePercentage = 0;
      let tokensSold = 0;
      let migrationThreshold = 800000000; // Default 800M tokens
      
      // Jupiter API sometimes provides bondingCurve as a decimal (0-1)
      if (typeof poolInfo.bondingCurve === 'number') {
        bondingCurvePercentage = poolInfo.bondingCurve * 100;
      }
      
      // Check for additional pool info
      if (poolInfo.poolInfo) {
        if (poolInfo.poolInfo.tokensSold) {
          tokensSold = poolInfo.poolInfo.tokensSold;
        }
        if (poolInfo.poolInfo.migrationThreshold) {
          migrationThreshold = poolInfo.poolInfo.migrationThreshold;
        }
      }
      
      // If we have tokensSold and migrationThreshold, calculate percentage
      if (tokensSold > 0 && migrationThreshold > 0) {
        bondingCurvePercentage = (tokensSold / migrationThreshold) * 100;
      }
      
      // Get current price
      let currentPrice = poolInfo.baseAsset.usdPrice || 0;
      
      // If no price, calculate from bonding curve
      if (currentPrice === 0 && bondingCurvePercentage > 0) {
        currentPrice = this.calculatePriceFromBondingCurve(bondingCurvePercentage);
      }
      
      // Extract additional metrics
      const holders = poolInfo.baseAsset?.holderCount || 0;
      const volume24h = poolInfo.volume24h || 0;
      const txns24h = poolInfo.txns24h || 0;
      const priceChange24h = poolInfo.baseAsset?.stats24h?.priceChange || 0;
      const liquidity = poolInfo.liquidity || 0;
      const createdAt = poolInfo.createdAt;
      
      const tokenInfo: DBCTokenInfo = {
        tokenAddress,
        configAddress: tokenAddress, // For DBC, config and token are often the same
        bondingCurvePercentage: Math.min(bondingCurvePercentage, 100),
        tokensSold,
        totalSupply: poolInfo.baseAsset.totalSupply || 1000000000,
        currentPrice,
        marketCap: currentPrice * (poolInfo.baseAsset.totalSupply || 1000000000),
        isComplete: bondingCurvePercentage >= 100,
        migrationThreshold,
        dex: poolInfo.dex,
        holders,
        volume24h,
        txns24h,
        priceChange24h,
        liquidity,
        createdAt
      };
      
      // Cache the result
      this.cache.set(tokenAddress, {
        data: tokenInfo,
        timestamp: Date.now()
      });
      
      return tokenInfo;
    } catch (error) {
      console.error('Error fetching DBC token info:', error);
      return null;
    }
  }
  
  /**
   * Fetch pool info from Jupiter API
   */
  private async fetchPoolInfo(tokenAddress: string): Promise<JupiterPoolInfo | null> {
    try {
      // Try our proxy first
      const response = await fetch(
        `/api/jupiter?endpoint=v1/pools&assetIds=${tokenAddress}`
      );
      
      if (!response.ok) {
        // Fallback to direct Data API call
        const directResponse = await fetch(
          `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
        );
        
        if (directResponse.ok) {
          const data = await directResponse.json();
          if (data.pools && data.pools.length > 0) {
            return data.pools[0];
          }
        }
        
        // Try DexScreener as last resort
        const altResponse = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
        );
        
        if (altResponse.ok) {
          const data = await altResponse.json();
          return this.parseDexScreenerData(data);
        }
        
        return null;
      }
      
      const data = await response.json();
      
      if (data.pools && data.pools.length > 0) {
        return data.pools[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching pool info:', error);
      return null;
    }
  }
  
  /**
   * Parse DexScreener data as fallback
   */
  private parseDexScreenerData(data: any): JupiterPoolInfo | null {
    if (!data.pairs || data.pairs.length === 0) return null;
    
    const pair = data.pairs[0];
    
    // Check if it's a DBC pool (Meteora, Moonshot, Pump.fun, etc)
    const dbcPlatforms = ['meteora', 'moonshot', 'pump'];
    const isDBC = dbcPlatforms.some(platform => 
      pair.dexId?.toLowerCase().includes(platform)
    );
    
    if (!isDBC) {
      return null;
    }
    
    return {
      baseAsset: {
        address: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        totalSupply: 1000000000, // Default
        usdPrice: parseFloat(pair.priceUsd || '0')
      },
      bondingCurve: pair.liquidity?.usd ? Math.min(pair.liquidity.usd / 50000, 1) : 0,
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      dex: pair.dexId || 'dbc'
    };
  }
  
  /**
   * Calculate price from bonding curve percentage
   */
  private calculatePriceFromBondingCurve(percentage: number): number {
    // Simplified bonding curve calculation
    // Real formula would depend on Meteora's specific implementation
    const basePriceUSD = 0.00001; // Starting price
    const maxPriceUSD = 0.001; // Price at 100% completion
    
    // Exponential curve
    const progress = percentage / 100;
    const price = basePriceUSD + (maxPriceUSD - basePriceUSD) * Math.pow(progress, 2);
    
    return price;
  }
  
  /**
   * Monitor bonding curve progress with live updates
   */
  async monitorBondingCurve(
    tokenAddress: string,
    callback: (info: DBCTokenInfo) => void,
    interval: number = 5000
  ): Promise<() => void> {
    // Initial fetch
    const info = await this.getDBCTokenInfo(tokenAddress);
    if (info) callback(info);
    
    // Set up polling
    const intervalId = setInterval(async () => {
      const updatedInfo = await this.getDBCTokenInfo(tokenAddress);
      if (updatedInfo) callback(updatedInfo);
    }, interval);
    
    // Return cleanup function
    return () => clearInterval(intervalId);
  }
  
  /**
   * Get multiple DBC tokens info in batch
   */
  async getBatchDBCInfo(tokenAddresses: string[]): Promise<Map<string, DBCTokenInfo>> {
    const results = new Map<string, DBCTokenInfo>();
    
    // Process in parallel but limit concurrency
    const batchSize = 5;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      const promises = batch.map(addr => this.getDBCTokenInfo(addr));
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach((info, index) => {
        if (info) {
          results.set(batch[index], info);
        }
      });
    }
    
    return results;
  }
}

// Singleton instance
let dbcClient: MeteoraDBCClient | null = null;

export function getMeteoraDBCClient(): MeteoraDBCClient {
  if (!dbcClient) {
    dbcClient = new MeteoraDBCClient();
  }
  return dbcClient;
}