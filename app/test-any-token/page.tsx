'use client';

import { useState } from 'react';
import BondingCurveProgress from '@/components/BondingCurveProgress';
import TradingInterface from '@/components/TradingInterface';
import TokenMetrics from '@/components/TokenMetrics';

export default function TestAnyTokenPage() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [testToken, setTestToken] = useState('');
  const [bondingData, setBondingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Example DBC tokens for quick testing
  const exampleTokens = [
    { 
      address: '5bESCywVdQcHxKLQ93MfC5uHJDy4FQkNRNHs9JJ7moon', 
      name: 'MOON (Moonshot)', 
      bonding: 'Check' 
    },
    { 
      address: '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM', 
      name: 'V (Voice)', 
      bonding: '26.85%' 
    },
    { 
      address: 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw', 
      name: 'ROUTI', 
      bonding: '0%' 
    },
    { 
      address: 'b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp', 
      name: 'RTNG', 
      bonding: 'Unknown' 
    }
  ];

  const testTokenBonding = async () => {
    if (!tokenAddress) {
      setError('Please enter a token address');
      return;
    }

    setLoading(true);
    setError('');
    setBondingData(null);

    try {
      // Fetch from Jupiter Data API
      const response = await fetch(
        `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.pools && data.pools.length > 0) {
        const pool = data.pools[0];
        
        // Check if it's any DBC token (Meteora, Moonshot, Pump.fun, Bags.fun, etc)
        const dbcDexes = ['met-dbc', 'moonshot', 'pump.fun', 'pumpfun', 'bags.fun', 'bagsfun'];
        const isDBC = dbcDexes.some(dex => pool.dex?.toLowerCase().includes(dex.toLowerCase())) || 
                      typeof pool.bondingCurve === 'number';
        
        if (isDBC) {
          const bondingPercentage = (pool.bondingCurve || 0) * 100;
          
          setBondingData({
            isDBCToken: true,
            bondingPercentage,
            symbol: pool.baseAsset?.symbol || 'Unknown',
            name: pool.baseAsset?.name || 'Unknown',
            price: pool.baseAsset?.usdPrice || 0,
            marketCap: pool.baseAsset?.mcap || 0,
            liquidity: pool.liquidity || 0,
            volume24h: pool.volume24h || 0,
            holders: pool.baseAsset?.holderCount || 0,
            txns24h: pool.txns24h || 0,
            priceChange24h: pool.baseAsset?.stats24h?.priceChange || 0,
            createdAt: pool.createdAt,
            platform: pool.dex || 'Unknown DBC',
            raw: pool
          });
          
          setTestToken(tokenAddress);
        } else {
          setBondingData({
            isDBCToken: false,
            dex: pool.dex,
            symbol: pool.baseAsset?.symbol || 'Unknown',
            message: `This is a ${pool.dex} token, not a Meteora DBC token`
          });
        }
      } else {
        setError('Token not found in Jupiter pools');
      }
    } catch (err: any) {
      console.error('Error fetching token:', err);
      setError(err.message || 'Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (address: string) => {
    setTokenAddress(address);
    setTimeout(() => testTokenBonding(), 100);
  };

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🧪 Test Any DBC Token
          </h1>
          <p className="text-gray-400">
            Enter any DBC token address (Meteora, Moonshot, Pump.fun) to see its bonding curve
          </p>
          <p className="text-green-400 text-sm mt-2">
            ✅ Using Pro II API (50 RPS) - Test as many tokens as you want!
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Enter token address (e.g., 7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM)"
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              onClick={testTokenBonding}
              disabled={loading || !tokenAddress}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Testing...' : 'Test Token'}
            </button>
          </div>

          {/* Quick Select Examples */}
          <div className="flex flex-wrap gap-2">
            <span className="text-gray-400 text-sm">Quick test:</span>
            {exampleTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleQuickSelect(token.address)}
                className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
              >
                {token.name} ({token.bonding})
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-8">
            <p className="text-red-400">❌ {error}</p>
          </div>
        )}

        {/* Results Section */}
        {bondingData && (
          <div className="space-y-8">
            {bondingData.isDBCToken ? (
              <>
                {/* Success - DBC Token Found */}
                <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
                  <h2 className="text-2xl font-bold text-green-400 mb-2">
                    ✅ DBC Token Found on {bondingData.platform}!
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-400">Symbol:</span>
                      <span className="ml-2 text-white font-semibold">{bondingData.symbol}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="ml-2 text-white">{bondingData.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Bonding:</span>
                      <span className="ml-2 text-yellow-400 font-bold">
                        {bondingData.bondingPercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <span className="ml-2 text-white">
                        ${bondingData.price < 0.00001 
                          ? bondingData.price.toExponential(2)
                          : bondingData.price.toFixed(8)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick Stats Bar */}
                  <div className="border-t border-green-700 pt-3 grid grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">👥 Holders:</span>
                      <span className="ml-1 text-white font-bold">{bondingData.holders || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">📊 24h Vol:</span>
                      <span className="ml-1 text-white font-bold">
                        ${(bondingData.volume24h / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">⚡ 24h Txns:</span>
                      <span className="ml-1 text-white font-bold">{bondingData.txns24h || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">📈 24h:</span>
                      <span className={`ml-1 font-bold ${
                        bondingData.priceChange24h > 0 ? 'text-green-400' : 
                        bondingData.priceChange24h < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {bondingData.priceChange24h > 0 ? '+' : ''}{bondingData.priceChange24h?.toFixed(2) || 0}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">💧 Liquidity:</span>
                      <span className="ml-1 text-white font-bold">
                        ${(bondingData.liquidity / 1000).toFixed(1)}K
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">💰 MCap:</span>
                      <span className="ml-1 text-white font-bold">
                        ${(bondingData.marketCap / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Bonding Curve Display */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Live Bonding Curve Progress
                  </h3>
                  <BondingCurveProgress 
                    tokenAddress={testToken}
                    showDetails={true}
                    autoRefresh={true}
                    refreshInterval={5000}
                  />
                </div>

                {/* Activity & Holders Metrics */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    📊 Activity & Holders
                  </h3>
                  <TokenMetrics 
                    tokenAddress={testToken}
                    autoRefresh={true}
                    refreshInterval={10000}
                  />
                </div>

                {/* Full Trading Interface */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Full Trading Interface
                  </h3>
                  <TradingInterface tokenAddress={testToken} />
                </div>

                {/* Raw Data */}
                <details className="bg-gray-900 rounded-lg p-6">
                  <summary className="cursor-pointer text-white font-semibold">
                    📊 Raw API Data (Click to expand)
                  </summary>
                  <pre className="mt-4 text-xs text-gray-400 overflow-auto">
                    {JSON.stringify(bondingData.raw, null, 2)}
                  </pre>
                </details>
              </>
            ) : (
              /* Not a DBC Token */
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <h2 className="text-xl font-bold text-yellow-400 mb-2">
                  ⚠️ Not a DBC Token
                </h2>
                <p className="text-gray-300">
                  {bondingData.message}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Symbol: {bondingData.symbol} | DEX: {bondingData.dex}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-12 bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            📝 How to Use
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Enter any Solana token address</li>
            <li>Click "Test Token" to check if it's a Meteora DBC token</li>
            <li>If it's a DBC token, you'll see:
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li>Bonding curve percentage (0-100%)</li>
                <li>Live progress bar with auto-refresh</li>
                <li>Full trading interface with charts</li>
                <li>All token metrics and stats</li>
              </ul>
            </li>
            <li>Use the example tokens for quick testing</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded">
            <p className="text-blue-400 text-sm">
              💡 Pro Tip: Your Pro II plan allows 50 requests per second, so you can test many tokens rapidly without rate limiting!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}