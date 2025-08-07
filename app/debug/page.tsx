'use client';

import { useState, useEffect } from 'react';
import DebugSwap from '@/components/DebugSwap';
import { JupiterAPI } from '@/lib/jupiter-api';

export default function DebugPage() {
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Test token - using BONK
  const TEST_TOKEN = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  
  useEffect(() => {
    async function fetchTokenData() {
      setLoading(true);
      try {
        console.log('Fetching token data for:', TEST_TOKEN);
        const data = await JupiterAPI.getTokenInfo(TEST_TOKEN);
        console.log('Token data received:', data);
        setTokenData(data);
      } catch (error) {
        console.error('Error fetching token data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchTokenData();
  }, []);

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          🔧 Debug Wallet & Swap
        </h1>
        
        {/* System Info */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">System Check</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Token API:</span>
              <span className="text-green-400">https://datapi.jup.ag</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Quote API:</span>
              <span className="text-green-400">https://quote-api.jup.ag/v6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Test Token:</span>
              <span className="text-blue-400">BONK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Token Data:</span>
              <span className={loading ? "text-yellow-400" : tokenData ? "text-green-400" : "text-red-400"}>
                {loading ? "Loading..." : tokenData ? "Loaded ✅" : "Failed ❌"}
              </span>
            </div>
          </div>
          
          {tokenData && (
            <div className="mt-4 p-4 bg-gray-800 rounded">
              <div className="text-xs text-gray-400">Token Info:</div>
              <div className="text-sm text-white">
                {tokenData.baseAsset?.symbol}: ${tokenData.baseAsset?.usdPrice?.toFixed(8) || '0'}
              </div>
            </div>
          )}
        </div>
        
        {/* Debug Swap Component */}
        {tokenData ? (
          <DebugSwap
            tokenAddress={tokenData.baseAsset.id}
            tokenSymbol={tokenData.baseAsset.symbol}
            tokenDecimals={tokenData.baseAsset.decimals || 9}
            currentPrice={tokenData.baseAsset.usdPrice || 0}
          />
        ) : (
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-yellow-400">
              {loading ? 'Loading token data...' : 'Failed to load token data'}
            </div>
          </div>
        )}
        
        {/* Instructions */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Debug Steps:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Connect your wallet using the button above</li>
            <li>Check if balance shows up (should update every 5 seconds)</li>
            <li>Click "Test RPC Connection" to verify RPC works</li>
            <li>Enter 0.001 SOL in the input field</li>
            <li>Click "Test Jupiter Quote API" to test quotes</li>
            <li>Check console (F12) for detailed logs</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded">
            <p className="text-xs text-yellow-400">
              ⚠️ Open browser console (F12) to see all debug logs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}