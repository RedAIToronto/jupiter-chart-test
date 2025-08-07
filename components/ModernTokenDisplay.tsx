'use client';

import { useEffect, useState } from 'react';
import { JupiterAPI, TokenInfo, ChartResponse } from '@/lib/jupiter-api';
import TradingViewChart from './TradingViewChart';

interface ModernTokenDisplayProps {
  tokenAddress: string;
}

export default function ModernTokenDisplay({ tokenAddress }: ModernTokenDisplayProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch token info
        const tokenData = await JupiterAPI.getTokenInfo(tokenAddress);
        
        if (!tokenData) {
          setError('Token not found or not indexed by Jupiter');
          setLoading(false);
          return;
        }
        
        setTokenInfo(tokenData);
        
        // Calculate 24h price change if we have the data
        const chartData = await JupiterAPI.getChartData(tokenAddress, '1_HOUR', 'price');
        if (chartData && chartData.candles && chartData.candles.length > 0) {
          const firstPrice = chartData.candles[0].open;
          const lastPrice = chartData.candles[chartData.candles.length - 1].close;
          const change = ((lastPrice - firstPrice) / firstPrice) * 100;
          setPriceChange24h(change);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch token data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [tokenAddress]);

  // Format price for display
  const formatPrice = (price: number | undefined): string => {
    if (!price) return '$0.00';
    
    if (price >= 1) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (price >= 0.01) {
      return `$${price.toFixed(4)}`;
    } else if (price >= 0.0001) {
      return `$${price.toFixed(6)}`;
    } else {
      return `$${price.toFixed(8)}`;
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

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-gray-800 rounded w-1/2 mb-6"></div>
        <div className="h-[600px] bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (error) {
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
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header with token info and price */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
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
              <span className="text-4xl font-bold text-white">
                {formatPrice(tokenInfo.baseAsset.usdPrice)}
              </span>
              {priceChange24h !== null && (
                <span className={`text-xl font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceChange24h >= 0 ? '↑' : '↓'} {Math.abs(priceChange24h).toFixed(2)}%
                </span>
              )}
            </div>
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
                  {(tokenInfo.bondingCurve * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Token address */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-gray-400 text-sm">Contract:</span>
          <code className="text-gray-300 text-sm bg-gray-800 px-2 py-1 rounded">
            {tokenInfo.baseAsset.id}
          </code>
          <button 
            onClick={() => navigator.clipboard.writeText(tokenInfo.baseAsset.id)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            📋
          </button>
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
      
      {/* Additional info */}
      <div className="bg-gray-800/50 p-6 grid grid-cols-4 gap-6 border-t border-gray-800">
        <div>
          <div className="text-gray-400 text-sm mb-1">Supply</div>
          <div className="text-white font-semibold">
            {tokenInfo.baseAsset.totalSupply 
              ? (tokenInfo.baseAsset.totalSupply / 1e9).toFixed(2) + 'B'
              : 'N/A'
            }
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">Decimals</div>
          <div className="text-white font-semibold">
            {tokenInfo.baseAsset.decimals}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">Created</div>
          <div className="text-white font-semibold">
            {new Date(tokenInfo.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-sm mb-1">Pool Type</div>
          <div className="text-white font-semibold">
            {tokenInfo.type}
          </div>
        </div>
      </div>
    </div>
  );
}