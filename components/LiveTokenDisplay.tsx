'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { JupiterAPI, TokenInfo } from '@/lib/jupiter-api';
import TradingViewChart from './TradingViewChart';

interface LiveTokenDisplayProps {
  tokenAddress: string;
}

interface PriceUpdate {
  price: number;
  timestamp: number;
  change: 'up' | 'down' | 'neutral';
}

export default function LiveTokenDisplay({ tokenAddress }: LiveTokenDisplayProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceUpdate[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animated price ticker
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [priceFlash, setPriceFlash] = useState<'green' | 'red' | null>(null);

  // Update frequency (ms)
  const UPDATE_INTERVAL = 3000; // 3 seconds for super live feel

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    setIsUpdating(true);
    
    try {
      // Fetch token info
      const tokenData = await JupiterAPI.getTokenInfo(tokenAddress);
      
      if (!tokenData) {
        setError('Token not found or not indexed by Jupiter');
        setLoading(false);
        setIsUpdating(false);
        return;
      }
      
      // Update with animation if price changed
      const currentPrice = tokenData.baseAsset.usdPrice || 0;
      if (previousPriceRef.current !== null && previousPriceRef.current !== currentPrice) {
        const change = currentPrice > previousPriceRef.current ? 'up' : 'down';
        
        // Add to price history
        setPriceHistory(prev => [...prev.slice(-19), { 
          price: currentPrice, 
          timestamp: Date.now(),
          change 
        }]);
        
        // Flash effect
        setPriceFlash(change === 'up' ? 'green' : 'red');
        setTimeout(() => setPriceFlash(null), 500);
        
        // Smooth price animation
        animatePrice(previousPriceRef.current, currentPrice);
      } else if (previousPriceRef.current === null) {
        setDisplayPrice(currentPrice);
      }
      
      previousPriceRef.current = currentPrice;
      setTokenInfo(tokenData);
      
      // Calculate 24h price change
      const chartData = await JupiterAPI.getChartData(tokenAddress, '1_HOUR', 'price');
      if (chartData && chartData.candles && chartData.candles.length > 0) {
        const firstPrice = chartData.candles[0].open;
        const lastPrice = chartData.candles[chartData.candles.length - 1].close;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        setPriceChange24h(change);
      }
      
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      if (!tokenInfo) setError('Failed to fetch token data');
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  }, [tokenAddress, tokenInfo]);

  // Smooth price animation
  const animatePrice = (from: number, to: number) => {
    const duration = 300; // ms
    const steps = 30;
    const stepTime = duration / steps;
    const increment = (to - from) / steps;
    let current = from;
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplayPrice(to);
        clearInterval(timer);
      } else {
        setDisplayPrice(current);
      }
    }, stepTime);
  };

  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Set up interval for updates
    updateIntervalRef.current = setInterval(() => {
      fetchData(false);
    }, UPDATE_INTERVAL);
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [tokenAddress, fetchData]);

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

  if (loading && !tokenInfo) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-800 rounded w-1/2 mb-6"></div>
        <div className="h-[600px] bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (error && !tokenInfo) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-red-500 text-xl font-semibold">{error}</div>
        <div className="text-gray-400 mt-2">Token Address: {tokenAddress}</div>
      </div>
    );
  }

  if (!tokenInfo) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden relative">
      {/* Live indicator */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-yellow-400' : 'bg-green-400'} animate-pulse`} />
        <span className="text-xs text-gray-400">
          {isUpdating ? 'Updating...' : 'Live'}
        </span>
        {lastUpdate && (
          <span className="text-xs text-gray-500">
            {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Header with token info and price */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {tokenInfo.baseAsset.icon && (
                <img src={tokenInfo.baseAsset.icon} alt={tokenInfo.baseAsset.symbol} className="w-10 h-10 rounded-full" />
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
                {formatPrice(displayPrice || tokenInfo.baseAsset.usdPrice)}
              </span>
              {priceChange24h !== null && (
                <span className={`text-xl font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(priceChange24h).toFixed(2)}%
                </span>
              )}
            </div>
            
            {/* Mini price sparkline */}
            {priceHistory.length > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <span className="text-xs text-gray-400 mr-2">Recent:</span>
                {priceHistory.slice(-10).map((update, i) => (
                  <div
                    key={i}
                    className={`w-1 transition-all duration-300 ${
                      update.change === 'up' ? 'bg-green-400' : 
                      update.change === 'down' ? 'bg-red-400' : 
                      'bg-gray-400'
                    }`}
                    style={{ height: `${Math.min(20, Math.max(4, Math.abs(update.price - (priceHistory[i-1]?.price || update.price)) * 1000000))}px` }}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Stats grid with live updates */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-right">
            <div className="transition-all duration-300 hover:scale-105">
              <div className="text-gray-400 text-sm">24h Volume</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.volume24h)}
              </div>
            </div>
            <div className="transition-all duration-300 hover:scale-105">
              <div className="text-gray-400 text-sm">Market Cap</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.baseAsset.mcap || tokenInfo.baseAsset.fdv)}
              </div>
            </div>
            <div className="transition-all duration-300 hover:scale-105">
              <div className="text-gray-400 text-sm">Liquidity</div>
              <div className="text-white font-semibold">
                {formatLargeNumber(tokenInfo.liquidity)}
              </div>
            </div>
            {tokenInfo.bondingCurve !== undefined && (
              <div className="transition-all duration-300 hover:scale-105">
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
        
        {/* Token address with copy */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-gray-400 text-sm">Contract:</span>
          <code className="text-gray-300 text-sm bg-gray-800 px-2 py-1 rounded font-mono">
            {tokenInfo.baseAsset.id.slice(0, 6)}...{tokenInfo.baseAsset.id.slice(-4)}
          </code>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(tokenInfo.baseAsset.id);
              // Flash copied indicator
              const btn = document.getElementById('copy-btn');
              if (btn) {
                btn.textContent = '✅';
                setTimeout(() => btn.textContent = '📋', 1000);
              }
            }}
            id="copy-btn"
            className="text-gray-400 hover:text-white transition-colors"
          >
            📋
          </button>
          
          {/* Social links if available */}
          {tokenInfo.baseAsset.website && (
            <a href={tokenInfo.baseAsset.website} target="_blank" rel="noopener noreferrer" 
               className="text-gray-400 hover:text-white transition-colors">
              🌐
            </a>
          )}
          {tokenInfo.baseAsset.twitter && (
            <a href={tokenInfo.baseAsset.twitter} target="_blank" rel="noopener noreferrer"
               className="text-gray-400 hover:text-white transition-colors">
              🐦
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
      
      {/* Live stats bar */}
      <div className="bg-gray-800/50 p-4 border-t border-gray-800">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-gray-400 text-xs mb-1">Supply</div>
            <div className="text-white font-semibold text-sm">
              {tokenInfo.baseAsset.totalSupply 
                ? (tokenInfo.baseAsset.totalSupply / 1e9).toFixed(2) + 'B'
                : 'N/A'
              }
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Holders</div>
            <div className="text-white font-semibold text-sm">
              {tokenInfo.baseAsset.holderCount || 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Decimals</div>
            <div className="text-white font-semibold text-sm">
              {tokenInfo.baseAsset.decimals}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Created</div>
            <div className="text-white font-semibold text-sm">
              {new Date(tokenInfo.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Refresh Rate</div>
            <div className="text-white font-semibold text-sm">
              {UPDATE_INTERVAL / 1000}s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}