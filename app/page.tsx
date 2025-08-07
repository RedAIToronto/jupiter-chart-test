'use client';

import OptimizedTokenDisplay from '@/components/OptimizedTokenDisplay';
import TradingInterface from '@/components/TradingInterface';
import { useCacheStats } from '@/contexts/TokenDataContext';
import { useState } from 'react';

function HomePage() {
  const cacheStats = useCacheStats();
  const [showTradingView, setShowTradingView] = useState(false);
  
  // Fresh DBC token with no trades yet
  const FRESH_DBC_TOKEN = 'b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp';
  // Popular tokens for testing
  const BONK_TOKEN = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  const WIF_TOKEN = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
  const JUP_TOKEN = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN';
  
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
        </div>
        
        {/* Fresh DBC token test */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-300 mb-4">
            Fresh DBC Token (No Trades Yet - Calculated Price)
          </h2>
          {showTradingView ? (
            <TradingInterface tokenAddress={FRESH_DBC_TOKEN} />
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
          
          {/* BONK Chart */}
          <div id="bonk-chart" className="mb-8">
            {showTradingView ? (
              <TradingInterface tokenAddress={BONK_TOKEN} />
            ) : (
              <OptimizedTokenDisplay tokenAddress={BONK_TOKEN} />
            )}
          </div>
          
          {/* WIF Chart */}
          <div id="wif-chart" className="mb-8">
            {showTradingView ? (
              <TradingInterface tokenAddress={WIF_TOKEN} />
            ) : (
              <OptimizedTokenDisplay tokenAddress={WIF_TOKEN} />
            )}
          </div>
          
          {/* JUP Chart */}
          <div id="jup-chart" className="mb-8">
            {showTradingView ? (
              <TradingInterface tokenAddress={JUP_TOKEN} />
            ) : (
              <OptimizedTokenDisplay tokenAddress={JUP_TOKEN} />
            )}
          </div>
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
