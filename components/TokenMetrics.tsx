'use client';

import { useState, useEffect } from 'react';
import { getMeteoraDBCClient } from '@/lib/meteora-dbc-client';

interface TokenMetricsProps {
  tokenAddress: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function TokenMetrics({
  tokenAddress,
  autoRefresh = true,
  refreshInterval = 10000 // 10 seconds
}: TokenMetricsProps) {
  const [metrics, setMetrics] = useState<{
    holders: number;
    volume24h: number;
    txns24h: number;
    priceChange24h: number;
    liquidity: number;
    marketCap: number;
    createdAt?: string;
    loading: boolean;
  }>({
    holders: 0,
    volume24h: 0,
    txns24h: 0,
    priceChange24h: 0,
    liquidity: 0,
    marketCap: 0,
    loading: true
  });

  useEffect(() => {
    const dbcClient = getMeteoraDBCClient();
    let intervalId: NodeJS.Timeout | null = null;

    const fetchMetrics = async () => {
      try {
        const info = await dbcClient.getDBCTokenInfo(tokenAddress);
        
        if (info) {
          setMetrics({
            holders: info.holders,
            volume24h: info.volume24h,
            txns24h: info.txns24h,
            priceChange24h: info.priceChange24h,
            liquidity: info.liquidity,
            marketCap: info.marketCap,
            createdAt: info.createdAt,
            loading: false
          });
        } else {
          setMetrics(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error fetching token metrics:', error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    // Initial fetch
    fetchMetrics();

    // Set up auto-refresh if enabled
    if (autoRefresh) {
      intervalId = setInterval(fetchMetrics, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tokenAddress, autoRefresh, refreshInterval]);

  if (metrics.loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-gray-700 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-700 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getActivityLevel = (): { label: string; color: string } => {
    if (metrics.txns24h > 1000) return { label: '🔥 Very High', color: 'text-red-500' };
    if (metrics.txns24h > 500) return { label: '⚡ High', color: 'text-orange-500' };
    if (metrics.txns24h > 100) return { label: '📊 Medium', color: 'text-yellow-500' };
    if (metrics.txns24h > 10) return { label: '📈 Low', color: 'text-blue-500' };
    return { label: '😴 Very Low', color: 'text-gray-500' };
  };

  const activity = getActivityLevel();
  const tokenAge = metrics.createdAt 
    ? Math.floor((Date.now() - new Date(metrics.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-4">
      {/* Activity Status Bar */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Activity Status</h3>
          <span className={`font-bold ${activity.color}`}>{activity.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">24h Txns:</span>
            <span className="ml-2 text-white font-semibold">{formatNumber(metrics.txns24h)}</span>
          </div>
          <div>
            <span className="text-gray-400">Token Age:</span>
            <span className="ml-2 text-white font-semibold">{tokenAge}d</span>
          </div>
          <div>
            <span className="text-gray-400">Active:</span>
            <span className="ml-2 text-green-400 font-semibold">
              {metrics.txns24h > 0 ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Holders */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-purple-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Holders</span>
            <span className="text-2xl">👥</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(metrics.holders)}
          </div>
          {metrics.holders > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {metrics.holders === 1 ? '1 holder' : `${metrics.holders} unique wallets`}
            </div>
          )}
        </div>

        {/* 24h Volume */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-blue-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">24h Volume</span>
            <span className="text-2xl">📊</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.volume24h)}
          </div>
          {metrics.volume24h > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {metrics.txns24h} transactions
            </div>
          )}
        </div>

        {/* Price Change */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-green-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">24h Change</span>
            <span className="text-2xl">
              {metrics.priceChange24h > 0 ? '📈' : metrics.priceChange24h < 0 ? '📉' : '➡️'}
            </span>
          </div>
          <div className={`text-2xl font-bold ${getChangeColor(metrics.priceChange24h)}`}>
            {metrics.priceChange24h > 0 ? '+' : ''}{metrics.priceChange24h.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.priceChange24h > 0 ? 'Pumping' : metrics.priceChange24h < 0 ? 'Dumping' : 'Stable'}
          </div>
        </div>

        {/* Liquidity */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-cyan-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Liquidity</span>
            <span className="text-2xl">💧</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.liquidity)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Available liquidity
          </div>
        </div>

        {/* Market Cap */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-yellow-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Market Cap</span>
            <span className="text-2xl">💰</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {formatCurrency(metrics.marketCap)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Fully diluted
          </div>
        </div>

        {/* Activity Score */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-pink-600 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Activity Score</span>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {Math.min(100, Math.round((metrics.txns24h / 10) + (metrics.holders / 100) * 10))}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Based on txns & holders
          </div>
        </div>
      </div>

      {/* Holder Distribution */}
      {metrics.holders > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Holder Analysis</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Holders:</span>
              <span className="text-white font-semibold">{metrics.holders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Avg per Holder:</span>
              <span className="text-white font-semibold">
                {formatCurrency(metrics.marketCap / Math.max(1, metrics.holders))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Holder Growth:</span>
              <span className={`font-semibold ${metrics.holders > 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                {metrics.holders > 100 ? 'Strong' : 'Growing'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Auto-refreshing every {refreshInterval / 1000}s</span>
        </div>
      )}
    </div>
  );
}