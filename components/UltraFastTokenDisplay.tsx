'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getAPIClient } from '../lib/api-client';
import { getWebSocketClient } from '../lib/websocket-client';
import { priceCache } from '../lib/cache-layer';

interface TokenData {
  configAddress: string;
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
  tokensSold: number;
  progress: number;
}

interface UltraFastTokenDisplayProps {
  configAddress: string;
  showChart?: boolean;
  enableRealtime?: boolean;
}

export function UltraFastTokenDisplay({ 
  configAddress, 
  showChart = true,
  enableRealtime = true 
}: UltraFastTokenDisplayProps) {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  const apiClient = useMemo(() => getAPIClient(), []);
  const wsClient = useMemo(() => enableRealtime ? getWebSocketClient() : null, [enableRealtime]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Check cache first (instant if available)
        const cached = priceCache.get<TokenData>(`data:${configAddress}`);
        if (cached) {
          setTokenData(cached);
          setLoading(false);
        }
        
        // Fetch fresh data in background
        const [data, chart] = await Promise.all([
          apiClient.getTokenData(configAddress),
          showChart ? apiClient.getChartData(configAddress, '1m', '24h') : Promise.resolve([])
        ]);
        
        setTokenData(data);
        setChartData(chart);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch token data:', error);
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [configAddress, apiClient, showChart]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!wsClient || !enableRealtime) return;

    const unsubscribe = wsClient.subscribe(
      configAddress,
      'price',
      (update) => {
        setTokenData(prev => ({
          ...prev!,
          price: update.price,
          volume24h: update.volume24h,
          marketCap: update.marketCap,
          change24h: update.change24h
        }));
        setLastUpdate(Date.now());
        
        // Update cache
        priceCache.set(`data:${configAddress}`, {
          ...tokenData!,
          price: update.price,
          volume24h: update.volume24h,
          marketCap: update.marketCap,
          change24h: update.change24h
        });
      }
    );

    return unsubscribe;
  }, [configAddress, wsClient, enableRealtime, tokenData]);

  // Format number with appropriate decimals
  const formatNumber = useCallback((num: number, decimals: number = 2) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  }, []);

  // Format price with appropriate precision
  const formatPrice = useCallback((price: number) => {
    if (price < 0.00001) return `$${price.toExponential(2)}`;
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  }, []);

  // Loading skeleton
  if (loading && !tokenData) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-800 rounded-lg"></div>
      </div>
    );
  }

  if (!tokenData) {
    return <div>No data available</div>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 text-white">
      {/* Price Section - Updates in real-time */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">
            {formatPrice(tokenData.price)}
          </h2>
          <div className={`text-sm ${tokenData.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {tokenData.change24h >= 0 ? '▲' : '▼'} {Math.abs(tokenData.change24h).toFixed(2)}%
          </div>
        </div>
        
        {/* Real-time indicator */}
        {enableRealtime && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-xs text-gray-400">Market Cap</div>
          <div className="text-lg font-semibold">{formatNumber(tokenData.marketCap)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">24h Volume</div>
          <div className="text-lg font-semibold">{formatNumber(tokenData.volume24h)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Tokens Sold</div>
          <div className="text-lg font-semibold">{formatNumber(tokenData.tokensSold, 0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Progress</div>
          <div className="text-lg font-semibold">{tokenData.progress.toFixed(1)}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${tokenData.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0%</span>
          <span>Migration at 100%</span>
        </div>
      </div>

      {/* Chart Section */}
      {showChart && chartData.length > 0 && (
        <div className="h-64 bg-gray-800 rounded-lg p-4">
          <MiniChart data={chartData} />
        </div>
      )}

      {/* Last Update */}
      <div className="text-xs text-gray-500 mt-4">
        Last update: {new Date(lastUpdate).toLocaleTimeString()}
      </div>
    </div>
  );
}

// Lightweight chart component
function MiniChart({ data }: { data: any[] }) {
  const maxPrice = Math.max(...data.map(d => d.close));
  const minPrice = Math.min(...data.map(d => d.close));
  const priceRange = maxPrice - minPrice;
  
  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="url(#gradient)"
        strokeWidth="2"
        points={data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - ((d.close - minPrice) / priceRange) * 100;
          return `${x},${y}`;
        }).join(' ')}
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Export for batch display
export function UltraFastTokenGrid({ configAddresses }: { configAddresses: string[] }) {
  const [tokensData, setTokensData] = useState<Map<string, TokenData>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const apiClient = useMemo(() => getAPIClient(), []);
  const wsClient = useMemo(() => getWebSocketClient(), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Batch fetch all tokens at once
        const data = await apiClient.getTokensData(configAddresses);
        setTokensData(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch tokens data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [configAddresses, apiClient]);

  // Subscribe to all tokens for real-time updates
  useEffect(() => {
    if (!wsClient) return;

    const unsubscribe = wsClient.subscribeMany(
      configAddresses.map(address => ({
        address,
        channels: ['price']
      })),
      (update) => {
        setTokensData(prev => {
          const newData = new Map(prev);
          const existing = newData.get(update.configAddress);
          
          if (existing) {
            newData.set(update.configAddress, {
              ...existing,
              price: update.price,
              volume24h: update.volume24h,
              marketCap: update.marketCap,
              change24h: update.change24h
            });
          }
          
          return newData;
        });
      }
    );

    return unsubscribe;
  }, [configAddresses, wsClient]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configAddresses.map(address => (
          <div key={address} className="animate-pulse">
            <div className="h-48 bg-gray-800 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from(tokensData.entries()).map(([address, data]) => (
        <UltraFastTokenDisplay
          key={address}
          configAddress={address}
          showChart={false}
          enableRealtime={true}
        />
      ))}
    </div>
  );
}