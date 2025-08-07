'use client';

import { useState, useEffect } from 'react';

interface SwapInterfaceProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  currentPrice: number;
  isBondingCurve?: boolean;
}

export default function SwapInterface({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  currentPrice,
  isBondingCurve = false,
}: SwapInterfaceProps) {
  const [inputToken, setInputToken] = useState<'SOL' | 'TOKEN'>('SOL');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // 1% default
  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);
  const [walletConnected, setWalletConnected] = useState(false);

  // Calculate output amount based on input
  useEffect(() => {
    if (!inputAmount || !currentPrice) return;
    
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      setOutputAmount('');
      setPriceImpact(0);
      return;
    }

    if (inputToken === 'SOL') {
      // Buying tokens with SOL
      const tokensOut = amount / currentPrice;
      setOutputAmount(tokensOut.toFixed(2));
      
      // Calculate price impact (simplified for bonding curves)
      if (isBondingCurve) {
        // Rough estimate: 30 SOL initial liquidity for DBC
        const impact = (amount / 30) * 100;
        setPriceImpact(Math.min(impact, 99));
      } else {
        // For regular AMMs, estimate based on liquidity
        setPriceImpact(amount > 10 ? 2.5 : amount > 1 ? 0.5 : 0.1);
      }
    } else {
      // Selling tokens for SOL
      const solOut = amount * currentPrice;
      setOutputAmount(solOut.toFixed(6));
      
      if (isBondingCurve) {
        const impact = (solOut / 30) * 100;
        setPriceImpact(Math.min(impact, 99));
      } else {
        setPriceImpact(solOut > 10 ? 2.5 : solOut > 1 ? 0.5 : 0.1);
      }
    }
  }, [inputAmount, inputToken, currentPrice, isBondingCurve]);

  const handleSwap = async () => {
    if (!walletConnected) {
      // For demo, just simulate wallet connection
      setWalletConnected(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // Build Jupiter swap request
      const inputMint = inputToken === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : tokenAddress;
      const outputMint = inputToken === 'SOL' 
        ? tokenAddress 
        : 'So11111111111111111111111111111111111111112';
      const amount = parseFloat(inputAmount) * (10 ** (inputToken === 'SOL' ? 9 : tokenDecimals));
      
      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}&` +
        `slippageBps=${slippage * 100}`
      );
      
      const quoteData = await quoteResponse.json();
      
      if (quoteData.error) {
        throw new Error(quoteData.error);
      }

      // For demo purposes, just show the quote
      const outAmount = quoteData.outAmount / (10 ** (inputToken === 'SOL' ? tokenDecimals : 9));
      alert(`Swap Quote Received!\n\nYou would receive: ${outAmount.toFixed(6)} ${inputToken === 'SOL' ? tokenSymbol : 'SOL'}\n\n(Connect a real wallet to execute the swap)`);
      
      // Reset form
      setInputAmount('');
      setOutputAmount('');
    } catch (error) {
      console.error('Swap failed:', error);
      alert('Failed to get swap quote. Token might not have enough liquidity.');
    } finally {
      setIsLoading(false);
    }
  };

  const flipTokens = () => {
    setInputToken(inputToken === 'SOL' ? 'TOKEN' : 'SOL');
    setInputAmount(outputAmount);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Swap</h3>
        <button
          onClick={() => setWalletConnected(!walletConnected)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
        >
          {walletConnected ? '🟢 Wallet Connected' : 'Connect Wallet'}
        </button>
      </div>

      {/* From */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">From</span>
          <span className="text-gray-400 text-sm">
            Balance: {walletConnected ? '10.5' : '0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            className="bg-transparent text-white text-2xl flex-1 outline-none"
            step="0.01"
          />
          <div className="bg-gray-700 px-3 py-1 rounded text-white font-semibold">
            {inputToken === 'SOL' ? 'SOL' : tokenSymbol}
          </div>
        </div>
        {inputAmount && (
          <div className="text-gray-400 text-xs mt-1">
            ≈ ${(parseFloat(inputAmount) * (inputToken === 'SOL' ? 150 : currentPrice)).toFixed(2)}
          </div>
        )}
      </div>

      {/* Swap button */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={flipTokens}
          className="bg-gray-700 hover:bg-gray-600 rounded-full p-2 transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">To (estimated)</span>
          <span className="text-gray-400 text-sm">
            Balance: {walletConnected ? (inputToken === 'SOL' ? '1,000,000' : '0') : '0'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outputAmount}
            readOnly
            placeholder="0.00"
            className="bg-transparent text-white text-2xl flex-1 outline-none"
          />
          <div className="bg-gray-700 px-3 py-1 rounded text-white font-semibold">
            {inputToken === 'SOL' ? tokenSymbol : 'SOL'}
          </div>
        </div>
        {outputAmount && (
          <div className="text-gray-400 text-xs mt-1">
            ≈ ${(parseFloat(outputAmount) * (inputToken === 'SOL' ? currentPrice : 150)).toFixed(2)}
          </div>
        )}
      </div>

      {/* Price info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Price</span>
          <span className="text-white">
            1 {tokenSymbol} = ${currentPrice < 0.01 ? currentPrice.toFixed(8) : currentPrice.toFixed(4)}
          </span>
        </div>
        {priceImpact > 0 && inputAmount && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price Impact</span>
            <span className={
              priceImpact > 10 ? 'text-red-400' : 
              priceImpact > 5 ? 'text-orange-400' : 
              priceImpact > 2 ? 'text-yellow-400' : 
              'text-green-400'
            }>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Slippage Tolerance</span>
          <div className="flex gap-1">
            {[0.5, 1, 2, 5].map((val) => (
              <button
                key={val}
                onClick={() => setSlippage(val)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  slippage === val
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Network Fee</span>
          <span className="text-white">~0.00025 SOL</span>
        </div>
      </div>

      {/* Swap button */}
      <button
        onClick={handleSwap}
        disabled={!inputAmount || isLoading || parseFloat(inputAmount) <= 0}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          walletConnected && inputAmount && !isLoading && parseFloat(inputAmount) > 0
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-[1.02]'
            : !walletConnected
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {!walletConnected
          ? 'Connect Wallet to Swap'
          : !inputAmount || parseFloat(inputAmount) <= 0
          ? 'Enter Amount'
          : isLoading
          ? 'Getting Quote...'
          : `Swap ${inputToken === 'SOL' ? 'SOL' : tokenSymbol} for ${inputToken === 'SOL' ? tokenSymbol : 'SOL'}`}
      </button>

      {/* Info for bonding curve tokens */}
      {isBondingCurve && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <p className="text-xs text-blue-400">
            🎯 This is a bonding curve token. Price increases as more people buy.
            Current bonding curve: {((isBondingCurve ? 0 : 0) * 100).toFixed(1)}%
          </p>
        </div>
      )}

      {/* Route info (for demo) */}
      {inputAmount && outputAmount && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Route Preview:</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white">{inputToken === 'SOL' ? 'SOL' : tokenSymbol}</span>
            <span className="text-gray-500">→</span>
            {isBondingCurve ? (
              <span className="text-purple-400">Meteora DBC</span>
            ) : (
              <span className="text-blue-400">Jupiter Aggregator</span>
            )}
            <span className="text-gray-500">→</span>
            <span className="text-white">{inputToken === 'SOL' ? tokenSymbol : 'SOL'}</span>
          </div>
        </div>
      )}
    </div>
  );
}