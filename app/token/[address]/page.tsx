'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BondingCurveProgress from '@/components/BondingCurveProgress';
import TokenMetrics from '@/components/TokenMetrics';
import HoldersList from '@/components/HoldersList';
import TradingInterface from '@/components/TradingInterface';

export default function TokenPage() {
  const params = useParams();
  const tokenAddress = params.address as string;
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokenAddress) {
      fetchTokenData();
    }
  }, [tokenAddress]);

  const fetchTokenData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch token data: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.pools && data.pools.length > 0) {
        const pool = data.pools[0];
        
        // Check if it's a DBC token
        const dbcDexes = ['met-dbc', 'moonshot', 'pump.fun', 'pumpfun', 'bags.fun', 'bagsfun'];
        const isDBC = dbcDexes.some(dex => pool.dex?.toLowerCase().includes(dex.toLowerCase())) || 
                      typeof pool.bondingCurve === 'number';
        
        if (isDBC) {
          setTokenData({
            isDBCToken: true,
            bondingPercentage: (pool.bondingCurve || 0) * 100,
            symbol: pool.baseAsset?.symbol || 'Unknown',
            name: pool.baseAsset?.name || 'Unknown',
            price: pool.baseAsset?.usdPrice || 0,
            marketCap: pool.baseAsset?.mcap || 0,
            liquidity: pool.liquidity || 0,
            volume24h: pool.volume24h || 0,
            holders: pool.baseAsset?.holderCount || 0,
            txns24h: pool.txns24h || 0,
            priceChange24h: pool.baseAsset?.stats24h?.priceChange || 0,
            totalSupply: pool.baseAsset?.totalSupply || 1000000000,
            platform: pool.dex || 'Unknown DBC',
            raw: pool
          });
        } else {
          setTokenData({
            isDBCToken: false,
            symbol: pool.baseAsset?.symbol || 'Unknown',
            platform: pool.dex,
            message: `This is a ${pool.dex} token, not a DBC token`
          });
        }
      } else {
        setError('Token not found');
      }
    } catch (err: any) {
      console.error('Error fetching token:', err);
      setError(err.message || 'Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading token data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-2">Error</h1>
            <p className="text-gray-300">{error}</p>
            <p className="text-gray-400 text-sm mt-2">Token: {tokenAddress}</p>
            <a href="/test-any-token" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Back to Token Tester
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenData?.isDBCToken) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-yellow-400 mb-2">
              Not a DBC Token
            </h1>
            <p className="text-gray-300">{tokenData?.message}</p>
            <p className="text-gray-400 text-sm mt-2">
              Symbol: {tokenData?.symbol} | Platform: {tokenData?.platform}
            </p>
            <a href="/test-any-token" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">
              ← Test Another Token
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {tokenData.symbol} 
                <span className="text-gray-400 text-lg ml-2">({tokenData.name})</span>
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Contract: {tokenAddress}
                <button
                  onClick={() => navigator.clipboard.writeText(tokenAddress)}
                  className="ml-2 text-blue-400 hover:text-blue-300"
                >
                  📋 Copy
                </button>
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                ${tokenData.price < 0.00001 
                  ? tokenData.price.toExponential(2)
                  : tokenData.price.toFixed(8)}
              </div>
              <div className={`text-sm ${
                tokenData.priceChange24h > 0 ? 'text-green-400' : 
                tokenData.priceChange24h < 0 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {tokenData.priceChange24h > 0 ? '+' : ''}{tokenData.priceChange24h?.toFixed(2)}% (24h)
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Platform:</span>
              <span className="ml-2 text-white font-semibold">{tokenData.platform}</span>
            </div>
            <div>
              <span className="text-gray-400">MCap:</span>
              <span className="ml-2 text-white font-semibold">
                ${(tokenData.marketCap / 1000000).toFixed(2)}M
              </span>
            </div>
            <div>
              <span className="text-gray-400">Holders:</span>
              <span className="ml-2 text-white font-semibold">{tokenData.holders}</span>
            </div>
            <div>
              <span className="text-gray-400">24h Vol:</span>
              <span className="ml-2 text-white font-semibold">
                ${(tokenData.volume24h / 1000).toFixed(1)}K
              </span>
            </div>
            <div>
              <span className="text-gray-400">24h Txns:</span>
              <span className="ml-2 text-white font-semibold">{tokenData.txns24h}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6">
          {/* Bonding Curve */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Bonding Curve Progress
            </h2>
            <BondingCurveProgress 
              tokenAddress={tokenAddress}
              showDetails={true}
              autoRefresh={true}
              refreshInterval={5000}
            />
          </div>

          {/* Activity & Metrics */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              📊 Activity & Metrics
            </h2>
            <TokenMetrics 
              tokenAddress={tokenAddress}
              autoRefresh={true}
              refreshInterval={10000}
            />
          </div>

          {/* Holders List */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              🏆 Top Holders
            </h2>
            <HoldersList 
              tokenAddress={tokenAddress}
              totalSupply={tokenData.totalSupply}
              showCount={20}
            />
          </div>

          {/* Trading Interface */}
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              📈 Trading
            </h2>
            <TradingInterface tokenAddress={tokenAddress} />
          </div>

          {/* External Links */}
          <div className="flex gap-4 justify-center">
            <a
              href={`https://solscan.io/token/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              View on Solscan →
            </a>
            <a
              href={`https://birdeye.so/token/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              View on Birdeye →
            </a>
            <a
              href={`https://dexscreener.com/solana/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              View on DexScreener →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}