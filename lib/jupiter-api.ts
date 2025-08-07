// Jupiter Data API Client
const BASE_URL = 'https://datapi.jup.ag';

export interface TokenInfo {
  id: string;
  chain: string;
  dex: string;
  type: string;
  createdAt: string;
  bondingCurve?: number;
  volume24h?: number;
  liquidity?: number;
  baseAsset: {
    id: string;
    name: string;
    symbol: string;
    icon?: string;
    decimals: number;
    twitter?: string;
    telegram?: string;
    website?: string;
    dev?: string;
    circSupply?: number;
    totalSupply?: number;
    fdv?: number;
    mcap?: number;
    usdPrice?: number;
    holderCount?: number;
  };
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  candles: ChartCandle[];
}

export interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
}

export interface HoldersResponse {
  holders: TokenHolder[];
  totalHolders: number;
}

export class JupiterAPI {
  // Fetch token information and current metrics
  static async getTokenInfo(tokenMintAddress: string): Promise<TokenInfo | null> {
    try {
      const response = await fetch(
        `${BASE_URL}/v1/pools?assetIds=${tokenMintAddress}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch token info:', response.status, response.statusText);
        return null;
      }
      
      const data = await response.json();
      console.log('Token info response:', data);
      
      // The API returns an object with pools array
      if (data.pools && data.pools.length > 0) {
        let tokenInfo = data.pools[0];
        
        // Handle fresh DBC tokens with no price
        if (tokenInfo.dex === 'met-dbc' && !tokenInfo.baseAsset.usdPrice) {
          const { enhanceDbcTokenInfo } = await import('./bonding-curve');
          tokenInfo = await enhanceDbcTokenInfo(tokenInfo);
        }
        
        return tokenInfo;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  // Fetch chart data
  static async getChartData(
    tokenMintAddress: string,
    interval: string = '15_MINUTE',
    type: 'price' | 'mcap' = 'price'
  ): Promise<ChartResponse | null> {
    try {
      const now = Date.now();
      const dayAgo = now - 24 * 60 * 60 * 1000;
      
      // The API requires the candles parameter
      const params = new URLSearchParams({
        interval,
        baseAsset: tokenMintAddress,
        from: dayAgo.toString(),
        to: now.toString(),
        type,
        candles: '96', // Request 96 candles (24 hours of 15-minute candles)
      });
      
      const url = `${BASE_URL}/v2/charts/${tokenMintAddress}?${params}`;
      console.log('Fetching chart data from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch chart data:', response.status, errorText);
        
        // If no chart data exists (fresh DBC), generate mock data
        if (response.status === 404 || errorText.includes('not found')) {
          console.log('No chart data available, checking if fresh DBC...');
          
          // Check if it's a fresh DBC token
          const tokenInfo = await this.getTokenInfo(tokenMintAddress);
          if (tokenInfo && tokenInfo.dex === 'met-dbc' && tokenInfo.bondingCurve === 0) {
            console.log('Fresh DBC detected, generating initial chart data...');
            const { BondingCurveCalculator } = await import('./bonding-curve');
            
            // Generate mock chart data with initial price
            const mockData = BondingCurveCalculator.generateMockChartData(
              tokenInfo.baseAsset.totalSupply,
              interval === '1_MINUTE' ? 1 : interval === '5_MINUTE' ? 5 : 15,
              96
            );
            
            return mockData;
          }
        }
        
        return null;
      }
      
      const data = await response.json();
      console.log('Chart data response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return null;
    }
  }

  // Fetch token holders
  static async getTokenHolders(tokenMintAddress: string): Promise<HoldersResponse | null> {
    try {
      const response = await fetch(
        `${BASE_URL}/v1/holders/${tokenMintAddress}`
      );
      
      if (!response.ok) {
        // Holders endpoint often returns 404 for tokens without holder data
        if (response.status === 404) {
          console.log('No holder data available for this token');
        } else {
          console.error('Failed to fetch holders:', response.status, response.statusText);
        }
        return null;
      }
      
      const data = await response.json();
      console.log('Holders response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching holders:', error);
      return null;
    }
  }

  // Fetch recent transactions
  static async getRecentTransactions(tokenMintAddress: string, limit: number = 10) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
      });
      
      const response = await fetch(
        `${BASE_URL}/v1/txs/${tokenMintAddress}?${params}`
      );
      
      if (!response.ok) {
        // Transactions endpoint often returns 404 for tokens without transaction data
        if (response.status === 404) {
          console.log('No transaction data available for this token');
        } else {
          console.error('Failed to fetch transactions:', response.status, response.statusText);
        }
        return null;
      }
      
      const data = await response.json();
      console.log('Transactions response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return null;
    }
  }
}