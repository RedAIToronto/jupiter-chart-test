'use client';

import { useEffect, useState } from 'react';
import { useTokenData, useCacheStats } from '@/contexts/TokenDataContext';
import TradingViewChart from './TradingViewChart';
import { getCachedChartData } from '@/lib/cache-manager';

interface OptimizedTokenDisplayProps {
  tokenAddress: string;
}

export default function OptimizedTokenDisplay({ tokenAddress }: OptimizedTokenDisplayProps) {
  const tokenData = useTokenData(tokenAddress);
  const cacheStats = useCacheStats();
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'green' | 'red' | null>(null);

  // Calculate 24h change
  useEffect(() => {
    async function calculate24hChange() {
      const chartData = await getCachedChartData(tokenAddress, '1_HOUR', 'price');
      if (chartData && chartData.candles && chartData.candles.length > 0) {
        const firstPrice = chartData.candles[0].open;
        const lastPrice = chartData.candles[chartData.candles.length - 1].close;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange24h(change);
      }
    }
    calculate24hChange();
  }, [tokenAddress, tokenData?.lastUpdate]);

  // Price change animation
  useEffect(() => {
    if (tokenData?.priceHistory && tokenData.priceHistory.length > 1) {
      const lastPrice = tokenData.priceHistory[tokenData.priceHistory.length - 1];
      const prevPrice = tokenData.priceHistory[tokenData.priceHistory.length - 2];
      
      if (lastPrice !== prevPrice) {
        setPriceFlash(lastPrice > prevPrice ? 'green' : 'red');
        setTimeout(() => setPriceFlash(null), 500);
      }
    }
  }, [tokenData?.priceHistory]);

  // Format price for display
  const formatPrice = (price: number | undefined): string => {
    if (!price) return '$0.00';
    
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else if (price >= 0.0001) {
      return `$${price.toFixed(6)}`;
    } else if (price >= 0.000001) {
      return `$${price.toFixed(8)}`;
    } else {
      return `$${price.toExponential(4)}`;
    }
  };

  // Format large numbers
  const formatLargeNumber = (num: number | undefined): string => {
    if (!num) return '$0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (!tokenData) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-800 rounded w-1/2 mb-6"></div>
        <div className="h-[600px] bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (tokenData.error && !tokenData.info) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-red-500 text-xl font-semibold">{tokenData.error}</div>
        <div className="text-gray-400 mt-2">Token Address: {tokenAddress}</div>
      </div>
    );
  }

  const tokenInfo = tokenData.info;
  
  if (!tokenInfo) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Cache stats indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${tokenData.isUpdating ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`} />
        <span className="text-gray-400">
          {tokenData.isUpdating ? 'Updating...' : 'Cached'}
        </span>
        {tokenData.lastUpdate && (
          <span className="text-gray-500">
            {tokenData.lastUpdate.toLocaleTimeString()}
          </span>
        )}
        <span className="text-gray-600 ml-2">
          Req/min: {cacheStats.requestCounts?.[`token:${tokenAddress}`] || 0}
        </span>
      </div>

      {/* Header with token info and price */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {tokenInfo.baseAsset.icon && (
                <img 
                  src={tokenInfo.baseAsset.icon} 
                  alt={tokenInfo.baseAsset.symbol} 
                  className="w-10 h-10 rounded-full"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <h2 className="text-3xl font-bold text-white">
                {tokenInfo.baseAsset.symbol}
              </h2>
              <span className="text-gray-400 text-lg">
                {tokenInfo.baseAsset.name}
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                {tokenInfo.dex}
              </span>
            </div>
            
            <div className="flex items-baseline gap-4">
              <span 
                className={`text-4xl font-bold transition-all duration-300 ${
                  priceFlash === 'green' ? 'text-green-400 scale-105' : 
                  priceFlash === 'red' ? 'text-red-400 scale-105' : 
                  'text-white'
                }`}
              >
                {formatPrice(tokenInfo.baseAsset.usdPrice)}
              </span>
              {priceChange24h !== null && (
                <span className={`text-xl font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(priceChange24h).toFixed(2)}%
                </span>
              )}
            </div>
            
            {/* Price history sparkline */}
            {tokenData.priceHistory.length > 1 && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-2">Trend:</span>
                {tokenData.priceHistory.map((price, i) => {
                  if (i === 0) return null;
                  const prevPrice = tokenData.priceHistory[i - 1];
                  const change = price - prevPrice;
                  return (
                    <div
                      key={i}
                      className={`w-1 transition-all duration-300 ${
                        change > 0 ? 'bg-green-400' : 
                        change < 0 ? 'bg-red-400' : 
                        'bg-gray-400'
                      }`}
                      style={{ 
                        height: `${Math.min(20, Math.max(4, Math.abs(change) * 10000000))}px` 
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-right">
            <div>
              <div className="text-gray-400 text-sm">24h Volume</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.volume24h)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Market Cap</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.baseAsset.mcap || tokenInfo.baseAsset.fdv)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Liquidity</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.liquidity)}
              </div>
            </div>
            {tokenInfo.bondingCurve !== undefined && (
              <div>
                <div className="text-gray-400 text-sm">Bonding Curve</div>
                <div className="text-white font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500"
                        style={{ width: `${tokenInfo.bondingCurve * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">{(tokenInfo.bondingCurve * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Token address with social links */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-gray-400 text-sm">Contract:</span>
          <code className="text-gray-300 text-sm bg-gray-800 px-2 py-1 rounded font-mono">
            {tokenInfo.baseAsset.id.slice(0, 6)}...{tokenInfo.baseAsset.id.slice(-4)}
          </code>
          <button 
            onClick={() => navigator.clipboard.writeText(tokenInfo.baseAsset.id)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy address"
          >
            📋
          </button>
          {tokenInfo.baseAsset.website && (
            <a href={tokenInfo.baseAsset.website} target="_blank" rel="noopener noreferrer" 
               className="text-gray-400 hover:text-white transition-colors" title="Website">
              🌐
            </a>
          )}
        </div>
      </div>
      
      {/* TradingView Chart */}
      <div className="p-6">
        <TradingViewChart 
          tokenAddress={tokenInfo.baseAsset.id}
          tokenSymbol={tokenInfo.baseAsset.symbol}
          tokenName={tokenInfo.baseAsset.name}
        />
      </div>
      
      {/* Cache info footer */}
      <div className="bg-gray-800/50 p-3 border-t border-gray-800">
        <div className="text-xs text-gray-500 text-center">
          Cache: {cacheStats.cacheSize || 0} items | 
          Pending: {cacheStats.pendingRequests || 0} | 
          Rate Limited: {cacheStats.rateLimitedKeys?.length || 0}
        </div>
      </div>
    </div>
  );
}