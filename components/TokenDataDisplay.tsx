'use client';

import { useEffect, useState } from 'react';
import { JupiterAPI, TokenInfo, ChartResponse, HoldersResponse } from '@/lib/jupiter-api';
import PriceChart from './PriceChart';

interface TokenDataDisplayProps {
  tokenAddress: string;
}

export default function TokenDataDisplay({ tokenAddress }: TokenDataDisplayProps) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [holders, setHolders] = useState<HoldersResponse | null>(null);
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching data for token:', tokenAddress);
        
        // Fetch all data in parallel
        const [tokenData, chart, holderData, txData] = await Promise.all([
          JupiterAPI.getTokenInfo(tokenAddress),
          JupiterAPI.getChartData(tokenAddress),
          JupiterAPI.getTokenHolders(tokenAddress),
          JupiterAPI.getRecentTransactions(tokenAddress, 5),
        ]);
        
        setTokenInfo(tokenData);
        setChartData(chart);
        setHolders(holderData);
        setTransactions(txData);
        
        if (!tokenData) {
          setError('Token not found or not indexed by Jupiter');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch token data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [tokenAddress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading token data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500 text-lg">{error}</div>
        <div className="mt-2 text-sm text-gray-500">Token Address: {tokenAddress}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Token Info Section */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Token Information</h2>
        {tokenInfo ? (
          <div className="space-y-2">
            <div className="flex gap-4">
              <span className="font-semibold">Symbol:</span>
              <span>{tokenInfo.baseAsset.symbol}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Name:</span>
              <span>{tokenInfo.baseAsset.name}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Current Price:</span>
              <span>${tokenInfo.usdPrice?.toFixed(8) || 'N/A'}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">24h Volume:</span>
              <span>${tokenInfo.volume24h?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Market Cap (FDV):</span>
              <span>${tokenInfo.fdv?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Liquidity:</span>
              <span>${tokenInfo.liquidity?.toLocaleString() || 'N/A'}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">DEX:</span>
              <span>{tokenInfo.dex}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Bonding Curve:</span>
              <span>{tokenInfo.bondingCurve !== undefined ? `${(tokenInfo.bondingCurve * 100).toFixed(2)}%` : 'N/A'}</span>
            </div>
            {tokenInfo.baseAsset.dev && (
              <div className="flex gap-4">
                <span className="font-semibold">Developer:</span>
                <span className="text-xs">{tokenInfo.baseAsset.dev}</span>
              </div>
            )}
            <div className="flex gap-4">
              <span className="font-semibold">Token Address:</span>
              <span className="text-xs break-all">{tokenInfo.baseAsset.id}</span>
            </div>
          </div>
        ) : (
          <div>No token information available</div>
        )}
      </div>

      {/* Chart Visualization */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Price & Volume Chart (Last 24h)</h2>
        {chartData && chartData.candles && chartData.candles.length > 0 ? (
          <PriceChart candles={chartData.candles} showVolume={true} />
        ) : (
          <div>No chart data available</div>
        )}
      </div>

      {/* Chart Data Details */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Chart Data Details</h2>
        {chartData && chartData.candles && chartData.candles.length > 0 ? (
          <div className="space-y-2">
            <div className="flex gap-4">
              <span className="font-semibold">Number of candles:</span>
              <span>{chartData.candles.length}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Latest candle:</span>
              <span>
                Time: {new Date(chartData.candles[chartData.candles.length - 1].time * 1000).toLocaleString()}
              </span>
            </div>
            <div className="flex gap-4">
              <span className="font-semibold">Latest close price:</span>
              <span>${chartData.candles[chartData.candles.length - 1].close?.toFixed(8) || 'N/A'}</span>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">View Raw Candle Data</summary>
              <div className="overflow-x-auto mt-2">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Open</th>
                      <th className="text-left p-2">High</th>
                      <th className="text-left p-2">Low</th>
                      <th className="text-left p-2">Close</th>
                      <th className="text-left p-2">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.candles.slice(-10).map((candle, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">{new Date(candle.time * 1000).toLocaleTimeString()}</td>
                        <td className="p-2">${candle.open?.toFixed(8) || 'N/A'}</td>
                        <td className="p-2">${candle.high?.toFixed(8) || 'N/A'}</td>
                        <td className="p-2">${candle.low?.toFixed(8) || 'N/A'}</td>
                        <td className="p-2">${candle.close?.toFixed(8) || 'N/A'}</td>
                        <td className="p-2">${candle.volume?.toLocaleString() || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        ) : (
          <div>No chart data available</div>
        )}
      </div>

      {/* Holders Section */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Token Holders</h2>
        {holders ? (
          <div className="space-y-2">
            <div className="flex gap-4">
              <span className="font-semibold">Total Holders:</span>
              <span>{holders.totalHolders}</span>
            </div>
            {holders.holders && holders.holders.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Top 5 Holders:</h3>
                <div className="space-y-1">
                  {holders.holders.slice(0, 5).map((holder, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono">{holder.address.slice(0, 8)}...{holder.address.slice(-6)}</span>
                      <span className="ml-2">({holder.percentage?.toFixed(2) || '0'}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>No holder data available</div>
        )}
      </div>

      {/* Transactions Section */}
      <div className="bg-gray-100 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Transactions</h2>
        {transactions && transactions.txs ? (
          <div className="space-y-2">
            <div className="flex gap-4">
              <span className="font-semibold">Total transactions shown:</span>
              <span>{transactions.txs.length}</span>
            </div>
            <pre className="text-xs overflow-x-auto bg-white p-2 rounded">
              {JSON.stringify(transactions.txs.slice(0, 2), null, 2)}
            </pre>
          </div>
        ) : (
          <div>No transaction data available</div>
        )}
      </div>

      {/* Raw API Responses (for debugging) */}
      <details className="bg-gray-100 rounded-lg p-6">
        <summary className="cursor-pointer font-bold text-lg">Raw API Responses (Debug)</summary>
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-semibold">Token Info Raw:</h3>
            <pre className="text-xs overflow-x-auto bg-white p-2 rounded mt-2">
              {JSON.stringify(tokenInfo, null, 2)}
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}