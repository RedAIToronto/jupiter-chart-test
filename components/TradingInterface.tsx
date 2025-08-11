'use client';

import { useState, useEffect, useCallback } from 'react';
import TradingViewChart from './TradingViewChart';
import SwapInterfaceWithBalances from './SwapInterfaceWithBalances';
import BondingCurveProgress from './BondingCurveProgress';
import { useTokenData } from '@/contexts/TokenDataContext';
import { getCachedChartData } from '@/lib/cache-manager';
import { clearCache } from '@/lib/cache-manager';

interface TradingInterfaceProps {
  tokenAddress: string;
}

export default function TradingInterface({ tokenAddress }: TradingInterfaceProps) {
  const tokenData = useTokenData(tokenAddress);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [showSwap, setShowSwap] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Callback to refresh data after swap (without visible chart reload)
  const handleSwapComplete = useCallback(() => {
    console.log('Swap completed, refreshing data...');
    // Clear cache to force fresh data
    clearCache();
    // Don't force re-render chart - let it update naturally through polling
    // The TradingView chart will update on its next polling cycle (2 seconds)
    // This avoids the visible "flash" of reloading
  }, []);

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

  if (!tokenData || !tokenData.info) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-[600px] bg-gray-800 rounded"></div>
      </div>
    );
  }

  const tokenInfo = tokenData.info;
  
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

  const formatLargeNumber = (num: number | undefined): string => {
    if (!num) return '$0';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {tokenInfo.baseAsset.icon && (
                <img 
                  src={tokenInfo.baseAsset.icon} 
                  alt={tokenInfo.baseAsset.symbol} 
                  className="w-10 h-10 rounded-full"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
              <h2 className="text-3xl font-bold text-white">{tokenInfo.baseAsset.symbol}</h2>
              <span className="text-gray-400 text-lg">{tokenInfo.baseAsset.name}</span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">{tokenInfo.dex}</span>
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
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-right">
            <div>
              <div className="text-gray-400 text-xs">Market Cap</div>
              <div className="text-white text-lg font-semibold">
                {formatLargeNumber(tokenInfo.baseAsset.mcap || tokenInfo.baseAsset.fdv)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">24h Volume</div>
              <div className="text-white text-lg font-semibold">
                {formatLargeNumber(tokenInfo.volume24h)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Liquidity</div>
              <div className="text-white text-lg font-semibold">
                {formatLargeNumber(tokenInfo.liquidity)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs">Holders</div>
              <div className="text-white text-lg font-semibold">
                {tokenInfo.baseAsset.holderCount || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Toggle swap button for mobile */}
        <div className="mt-4 lg:hidden">
          <button
            onClick={() => setShowSwap(!showSwap)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors w-full"
          >
            {showSwap ? 'Hide Swap' : 'Show Swap'} 💱
          </button>
        </div>
      </div>

      {/* Bonding Curve Progress for DBC tokens */}
      {tokenInfo.dex === 'met-dbc' && (
        <div className="mt-4">
          <BondingCurveProgress 
            tokenAddress={tokenAddress}
            showDetails={true}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </div>
      )}

      {/* Main content - Chart and Swap side by side */}
      <div className="flex flex-col lg:flex-row">
        {/* Chart - Takes 2/3 width on desktop */}
        <div className="flex-1 lg:flex-[2] p-6">
          <TradingViewChart
            tokenAddress={tokenInfo.baseAsset.id}
            tokenSymbol={tokenInfo.baseAsset.symbol}
            tokenName={tokenInfo.baseAsset.name}
          />
        </div>

        {/* Swap Interface - Takes 1/3 width on desktop */}
        <div className={`lg:flex-1 p-6 border-t lg:border-t-0 lg:border-l border-gray-800 ${showSwap ? 'block' : 'hidden lg:block'}`}>
          <SwapInterfaceWithBalances
            tokenAddress={tokenInfo.baseAsset.id}
            tokenSymbol={tokenInfo.baseAsset.symbol}
            tokenDecimals={tokenInfo.baseAsset.decimals || 9}
            currentPrice={tokenInfo.baseAsset.usdPrice || 0}
            isBondingCurve={tokenInfo.dex === 'met-dbc'}
            onSwapComplete={handleSwapComplete}
          />
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="bg-gray-800/50 p-4 border-t border-gray-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
          <div>
            <div className="text-gray-400 text-xs">Supply</div>
            <div className="text-white text-sm font-semibold">
              {tokenInfo.baseAsset.totalSupply 
                ? (tokenInfo.baseAsset.totalSupply / 1e9).toFixed(2) + 'B' 
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Circulating</div>
            <div className="text-white text-sm font-semibold">
              {tokenInfo.baseAsset.circSupply 
                ? (tokenInfo.baseAsset.circSupply / 1e9).toFixed(2) + 'B' 
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Created</div>
            <div className="text-white text-sm font-semibold">
              {new Date(tokenInfo.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Pool Type</div>
            <div className="text-white text-sm font-semibold">{tokenInfo.type}</div>
          </div>
          <div className="col-span-2">
            <div className="text-gray-400 text-xs">Contract</div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tokenInfo.baseAsset.id);
                const btn = document.getElementById('copy-contract');
                if (btn) {
                  btn.textContent = 'Copied! ✅';
                  setTimeout(() => {
                    btn.textContent = `${tokenInfo.baseAsset.id.slice(0, 6)}...${tokenInfo.baseAsset.id.slice(-4)} 📋`;
                  }, 2000);
                }
              }}
              id="copy-contract"
              className="text-white text-sm font-semibold hover:text-blue-400 transition-colors"
            >
              {tokenInfo.baseAsset.id.slice(0, 6)}...{tokenInfo.baseAsset.id.slice(-4)} 📋
            </button>
          </div>
        </div>

        {/* Social links */}
        {(tokenInfo.baseAsset.website || tokenInfo.baseAsset.twitter || tokenInfo.baseAsset.telegram) && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-center gap-4">
            {tokenInfo.baseAsset.website && (
              <a 
                href={tokenInfo.baseAsset.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                🌐 Website
              </a>
            )}
            {tokenInfo.baseAsset.twitter && (
              <a 
                href={tokenInfo.baseAsset.twitter} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                🐦 Twitter
              </a>
            )}
            {tokenInfo.baseAsset.telegram && (
              <a 
                href={tokenInfo.baseAsset.telegram} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                📱 Telegram
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}