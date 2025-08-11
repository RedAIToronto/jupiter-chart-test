'use client';

import { useState } from 'react';
import BondingCurveProgress, { BondingCurveProgressCompact } from '@/components/BondingCurveProgress';
import { getMeteoraDBCClient } from '@/lib/meteora-dbc-client';

export default function BondingDemoPage() {
  const [tokenAddress, setTokenAddress] = useState('b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp');
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTokens = [
    { address: 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw', name: 'ROUTI (0% - Just Started!)' },
    { address: 'b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp', name: 'RTNG (Fresh DBC)' },
    { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'BONK' },
    { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', name: 'WIF' },
  ];

  const fetchManually = async () => {
    setLoading(true);
    try {
      const dbcClient = getMeteoraDBCClient();
      
      // Get percentage
      const percentage = await dbcClient.getBondingCurvePercentage(tokenAddress);
      
      // Get full info
      const info = await dbcClient.getDBCTokenInfo(tokenAddress);
      
      setFetchedData({
        percentage,
        fullInfo: info
      });
    } catch (error) {
      console.error('Error fetching:', error);
      setFetchedData({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">
          🎯 Bonding Curve Demo
        </h1>
        <p className="text-gray-400 mb-8">
          Test and visualize Meteora DBC bonding curve percentages
        </p>

        {/* Token Selector */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Select Token</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            {testTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => setTokenAddress(token.address)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  tokenAddress === token.address
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {token.name}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Enter token address..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              onClick={fetchManually}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Fetching...' : 'Fetch Data'}
            </button>
          </div>
        </div>

        {/* Full Display */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Full Display (Auto-refresh every 5s)
          </h2>
          <BondingCurveProgress 
            tokenAddress={tokenAddress}
            showDetails={true}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </div>

        {/* Compact Display */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Compact Display
          </h2>
          <BondingCurveProgressCompact tokenAddress={tokenAddress} />
        </div>

        {/* Manual Fetch Results */}
        {fetchedData && (
          <div className="bg-gray-900 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Manual Fetch Results
            </h2>
            {fetchedData.error ? (
              <div className="text-red-400">Error: {fetchedData.error}</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-800 rounded p-4">
                  <div className="text-gray-400 text-sm mb-1">Percentage Only</div>
                  <div className="text-2xl font-bold text-white">
                    {fetchedData.percentage?.toFixed(2)}%
                  </div>
                </div>
                
                {fetchedData.fullInfo && (
                  <div className="bg-gray-800 rounded p-4">
                    <div className="text-gray-400 text-sm mb-2">Full Info (JSON)</div>
                    <pre className="text-xs text-gray-300 overflow-auto">
                      {JSON.stringify(fetchedData.fullInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Code Examples */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            📝 Code Examples
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gray-800 rounded p-4">
              <div className="text-gray-400 text-sm mb-2">Display Component</div>
              <pre className="text-xs text-gray-300 overflow-auto">{`<BondingCurveProgress 
  tokenAddress="${tokenAddress}"
  showDetails={true}
  autoRefresh={true}
  refreshInterval={5000}
/>`}</pre>
            </div>

            <div className="bg-gray-800 rounded p-4">
              <div className="text-gray-400 text-sm mb-2">Fetch Percentage</div>
              <pre className="text-xs text-gray-300 overflow-auto">{`const dbcClient = getMeteoraDBCClient();
const percentage = await dbcClient.getBondingCurvePercentage('${tokenAddress}');
console.log(\`Bonding curve: \${percentage}%\`);`}</pre>
            </div>

            <div className="bg-gray-800 rounded p-4">
              <div className="text-gray-400 text-sm mb-2">Monitor Updates</div>
              <pre className="text-xs text-gray-300 overflow-auto">{`const cleanup = await dbcClient.monitorBondingCurve(
  '${tokenAddress}',
  (info) => console.log(\`Updated: \${info.bondingCurvePercentage}%\`),
  5000
);`}</pre>
            </div>
          </div>
        </div>

        {/* Visual Indicators Guide */}
        <div className="bg-gray-900 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            🎨 Visual Indicators
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { range: '0-25%', status: '🎯 Just started', color: 'from-purple-600 to-pink-600' },
              { range: '25-50%', status: '🌱 Building momentum', color: 'from-blue-500 to-purple-500' },
              { range: '50-75%', status: '📈 Growing strong', color: 'from-blue-500 to-purple-500' },
              { range: '75-90%', status: '🚀 Pumping!', color: 'from-yellow-500 to-orange-500' },
              { range: '90-99%', status: '🔥 Almost there!', color: 'from-yellow-500 to-orange-500' },
              { range: '100%', status: '✅ Complete!', color: 'from-green-500 to-green-600' },
            ].map((indicator) => (
              <div key={indicator.range} className="bg-gray-800 rounded p-3">
                <div className="text-white font-semibold mb-1">{indicator.range}</div>
                <div className="text-sm text-gray-400 mb-2">{indicator.status}</div>
                <div className={`h-2 rounded-full bg-gradient-to-r ${indicator.color}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}