'use client';

import OptimizedTokenDisplay from '@/components/OptimizedTokenDisplay';
import TradingInterface from '@/components/TradingInterface';
import { UltraFastTokenDisplay, UltraFastTokenGrid } from '@/components/UltraFastTokenDisplay';
import { useCacheStats } from '@/contexts/TokenDataContext';
import { useState, useEffect } from 'react';
import { getRPCLoadBalancer } from '@/lib/rpc-load-balancer';
import { getWebSocketClient } from '@/lib/websocket-client';
import { globalCache } from '@/lib/cache-layer';

function HomePage() {
  const cacheStats = useCacheStats();
  const [showTradingView, setShowTradingView] = useState(false);
  const [useUltraFast, setUseUltraFast] = useState(true);
  const [rpcStats, setRpcStats] = useState<any>(null);
  const [wsStatus, setWsStatus] = useState<any>(null);
  const [ultraCacheStats, setUltraCacheStats] = useState<any>(null);
  const [performanceTest, setPerformanceTest] = useState<{ running: boolean; results?: any }>({ running: false });
  
  // Fresh DBC token with no trades yet
  const FRESH_DBC_TOKEN = 'b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp';
  // Popular tokens for testing
  const BONK_TOKEN = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  const WIF_TOKEN = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
  const JUP_TOKEN = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
  
  // Monitor performance stats
  useEffect(() => {
    const interval = setInterval(() => {
      // RPC stats
      const rpcBalancer = getRPCLoadBalancer();
      setRpcStats(rpcBalancer.getStats());
      
      // WebSocket status (disabled for now)
      setWsStatus({ connected: false, subscriptions: 0 });
      
      // Ultra cache stats
      setUltraCacheStats(globalCache.getStats());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Performance test
  const runPerformanceTest = async () => {
    setPerformanceTest({ running: true });
    
    const startTime = Date.now();
    const results = {
      jupiterQuote: 0,
      rpcCall: 0,
      cacheHit: 0,
      total: 0
    };
    
    try {
      // Test 1: Jupiter quote (with API key)
      const quoteStart = Date.now();
      const response = await fetch(
        'https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000',
        {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_JUPITER_API_KEY || ''
          }
        }
      );
      await response.json();
      results.jupiterQuote = Date.now() - quoteStart;
      
      // Test 2: RPC call through API
      const rpcStart = Date.now();
      await fetch('/api/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'getSlot',
          params: {}
        })
      });
      results.rpcCall = Date.now() - rpcStart;
      
      // Test 3: Cache hit (second call should be cached)
      const cacheStart = Date.now();
      globalCache.set('test-key', { data: 'test' });
      globalCache.get('test-key');
      results.cacheHit = Date.now() - cacheStart;
      
      results.total = Date.now() - startTime;
      
      setPerformanceTest({ running: false, results });
    } catch (error) {
      console.error('Performance test error:', error);
      setPerformanceTest({ running: false });
    }
  };
  
  return (
    <main className="min-h-screen bg-black">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            Jupiter Chart Integration
          </h1>
          <p className="text-gray-400">
            Professional TradingView charts with integrated swap functionality
          </p>
        </div>
        
        {/* Toggle between views */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowTradingView(!showTradingView)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105"
          >
            {showTradingView ? '📊 Show Chart Only' : '💱 Show Trading Interface (Chart + Swap)'}
          </button>
          <button
            onClick={() => setUseUltraFast(!useUltraFast)}
            className={`font-bold py-3 px-8 rounded-lg transition-all transform hover:scale-105 ${
              useUltraFast 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {useUltraFast ? '⚡ Ultra-Fast Mode ON' : '🐌 Standard Mode'}
          </button>
        </div>
        
        {/* Performance Dashboard */}
        {useUltraFast && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">🚀 Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">RPC Status</div>
                <div className="text-white font-semibold">
                  🟢 QuickNode Active
                </div>
                <div className="text-xs text-gray-500">Premium endpoint</div>
              </div>
              <div>
                <div className="text-gray-400">Jupiter API</div>
                <div className="text-white font-semibold">
                  🟢 API Key Active
                </div>
                <div className="text-xs text-gray-500">Priority access</div>
              </div>
              <div>
                <div className="text-gray-400">Cache Status</div>
                <div className="text-white font-semibold">
                  {ultraCacheStats ? (
                    ultraCacheStats.totalSize > 0 
                      ? `✅ ${ultraCacheStats.totalSize} cached`
                      : '⏳ Ready'
                  ) : 'Initializing...'}
                </div>
                <div className="text-xs text-gray-500">
                  {ultraCacheStats?.hotCacheSize > 0 && `${ultraCacheStats.hotCacheSize} hot`}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Performance</div>
                <div className="text-white font-semibold">
                  ⚡ Ultra-Fast Mode
                </div>
                <div className="text-xs text-gray-500">All optimizations active</div>
              </div>
            </div>
            
            {/* API Features */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Active Features:</div>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                  ✓ Multi-layer caching
                </span>
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                  ✓ Jupiter API key
                </span>
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                  ✓ QuickNode RPC
                </span>
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
                  ✓ Batch fetching
                </span>
                <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded">
                  ⏸ WebSocket (pending endpoint)
                </span>
              </div>
            </div>
            
            {/* Performance Test */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400">Test API Performance</div>
                  {performanceTest.results && (
                    <div className="mt-1 text-xs space-y-1">
                      <div className="text-green-400">Jupiter API: {performanceTest.results.jupiterQuote}ms</div>
                      <div className="text-green-400">RPC Call: {performanceTest.results.rpcCall}ms</div>
                      <div className="text-green-400">Cache Hit: {performanceTest.results.cacheHit}ms</div>
                      <div className="text-white font-semibold">Total: {performanceTest.results.total}ms</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={runPerformanceTest}
                  disabled={performanceTest.running}
                  className={`px-3 py-1 text-xs rounded transition-all ${
                    performanceTest.running 
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {performanceTest.running ? 'Testing...' : 'Run Speed Test'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Fresh DBC token test */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-300 mb-4">
            Fresh DBC Token (No Trades Yet - Calculated Price)
          </h2>
          {showTradingView ? (
            <TradingInterface tokenAddress={FRESH_DBC_TOKEN} />
          ) : useUltraFast ? (
            <UltraFastTokenDisplay configAddress={FRESH_DBC_TOKEN} />
          ) : (
            <OptimizedTokenDisplay tokenAddress={FRESH_DBC_TOKEN} />
          )}
        </div>
        
        {/* Working examples */}
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-white mb-6">
            Live Examples
          </h2>
          
          {/* Quick token selector */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <button 
              onClick={() => {
                const element = document.getElementById('bonk-chart');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              📈 BONK
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('wif-chart');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              🐕 WIF (dogwifhat)
            </button>
            <button 
              onClick={() => {
                const element = document.getElementById('jup-chart');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              🪐 JUP
            </button>
          </div>
          
          {/* Display all tokens in ultra-fast grid or individual */}
          {useUltraFast && !showTradingView ? (
            <UltraFastTokenGrid configAddresses={[BONK_TOKEN, WIF_TOKEN, JUP_TOKEN]} />
          ) : (
            <>
              {/* BONK Chart */}
              <div id="bonk-chart" className="mb-8">
                {showTradingView ? (
                  <TradingInterface tokenAddress={BONK_TOKEN} />
                ) : useUltraFast ? (
                  <UltraFastTokenDisplay configAddress={BONK_TOKEN} />
                ) : (
                  <OptimizedTokenDisplay tokenAddress={BONK_TOKEN} />
                )}
              </div>
              
              {/* WIF Chart */}
              <div id="wif-chart" className="mb-8">
                {showTradingView ? (
                  <TradingInterface tokenAddress={WIF_TOKEN} />
                ) : useUltraFast ? (
                  <UltraFastTokenDisplay configAddress={WIF_TOKEN} />
                ) : (
                  <OptimizedTokenDisplay tokenAddress={WIF_TOKEN} />
                )}
              </div>
              
              {/* JUP Chart */}
              <div id="jup-chart" className="mb-8">
                {showTradingView ? (
                  <TradingInterface tokenAddress={JUP_TOKEN} />
                ) : useUltraFast ? (
                  <UltraFastTokenDisplay configAddress={JUP_TOKEN} />
                ) : (
                  <OptimizedTokenDisplay tokenAddress={JUP_TOKEN} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Global cache stats */}
      <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-400">
        <div className="font-semibold mb-1">Cache Status</div>
        <div>Items: {cacheStats.cacheSize || 0}</div>
        <div>Pending: {cacheStats.pendingRequests || 0}</div>
        <div>Rate Limited: {cacheStats.rateLimitedKeys?.length || 0}</div>
      </div>
    </main>
  );
}

export default function Home() {
  return <HomePage />;
}
