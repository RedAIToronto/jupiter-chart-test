'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, VersionedTransaction } from '@solana/web3.js';

interface SwapInterfaceProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  currentPrice: number;
  isBondingCurve?: boolean;
}

export default function SwapInterfaceReal({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  currentPrice,
  isBondingCurve = false,
}: SwapInterfaceProps) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction, signTransaction } = useWallet();
  
  const [inputToken, setInputToken] = useState<'SOL' | 'TOKEN'>('SOL');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // 1% default
  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [quoteResponse, setQuoteResponse] = useState<any>(null);
  const [solPrice, setSolPrice] = useState<number>(150); // Default SOL price

  // Fetch current SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        // Use Jupiter's price API to get SOL price
        const response = await fetch('https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112');
        const data = await response.json();
        if (data?.data?.So11111111111111111111111111111111111111112?.price) {
          setSolPrice(data.data.So11111111111111111111111111111111111112.price);
        }
      } catch (error) {
        console.error('Failed to fetch SOL price:', error);
        // Keep default price
      }
    }
    
    fetchSolPrice();
    // Refresh SOL price every 30 seconds
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch wallet balances with better error handling
  useEffect(() => {
    async function fetchBalances() {
      if (!connected || !publicKey) {
        setWalletBalance(0);
        setTokenBalance(0);
        return;
      }

      try {
        // Get SOL balance with retry logic
        let retries = 3;
        let solBalance = 0;
        
        while (retries > 0) {
          try {
            solBalance = await connection.getBalance(publicKey);
            break; // Success, exit loop
          } catch (err: any) {
            retries--;
            if (retries === 0) {
              console.error('Failed to fetch SOL balance after retries:', err);
              // Set a default or cached value
              setWalletBalance(0);
              return;
            }
            // Wait a bit before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        setWalletBalance(solBalance / 1e9); // Convert lamports to SOL

        // For token balance, we need to find the token account
        // This is complex, so for now we'll skip it
        // In production, you'd use:
        // const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: new PublicKey(tokenAddress) });
        setTokenBalance(0);
      } catch (error: any) {
        console.error('Error fetching balances:', error);
        // Don't crash, just set to 0
        setWalletBalance(0);
        setTokenBalance(0);
      }
    }

    fetchBalances();
    // Reduce refresh rate to avoid rate limits
    const interval = setInterval(fetchBalances, 10000); // 10 seconds instead of 5
    return () => clearInterval(interval);
  }, [connected, publicKey, connection, tokenAddress]);

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

  // Get quote from Jupiter with better error handling
  const getQuote = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) return null;

    try {
      const inputMint = inputToken === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : tokenAddress;
      const outputMint = inputToken === 'SOL' 
        ? tokenAddress 
        : 'So11111111111111111111111111111111111111112';
      const amount = Math.floor(parseFloat(inputAmount) * (10 ** (inputToken === 'SOL' ? 9 : tokenDecimals)));
      
      console.log('Getting quote for:', {
        inputMint,
        outputMint,
        amount,
        slippageBps: Math.floor(slippage * 100)
      });
      
      const response = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}&` +
        `slippageBps=${Math.floor(slippage * 100)}&` +
        `onlyDirectRoutes=false&` +
        `asLegacyTransaction=false`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Quote API error:', response.status, errorText);
        throw new Error(`Failed to get quote: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('Quote error:', data.error);
        if (data.error.includes('not enough liquidity')) {
          throw new Error('Not enough liquidity for this swap. Try a smaller amount.');
        }
        throw new Error(data.error);
      }

      console.log('Quote received:', data);
      return data;
    } catch (error: any) {
      console.error('Failed to get quote:', error);
      // Provide more specific error messages
      if (error.message?.includes('liquidity')) {
        alert('Not enough liquidity for this swap. Try a smaller amount or a different token.');
      } else if (error.message?.includes('Failed to fetch')) {
        alert('Network error. Please check your connection and try again.');
      }
      return null;
    }
  };

  const handleSwap = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      alert('Please enter an amount');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get fresh quote
      const quote = await getQuote();
      if (!quote) {
        throw new Error('Failed to get swap quote');
      }

      setQuoteResponse(quote);

      // Get swap transaction from Jupiter
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      const swapData = await swapResponse.json();
      
      if (!swapData || !swapData.swapTransaction) {
        throw new Error('Failed to get swap transaction');
      }

      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Send the transaction
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      alert(`Swap successful! 🎉\n\nTransaction: ${signature}\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}`);
      
      // Reset form
      setInputAmount('');
      setOutputAmount('');
      setQuoteResponse(null);
    } catch (error: any) {
      console.error('Swap failed:', error);
      
      // More detailed error messages
      if (error.message?.includes('insufficient')) {
        alert('Insufficient balance for this swap');
      } else if (error.message?.includes('slippage')) {
        alert('Price moved too much. Try increasing slippage tolerance');
      } else if (error.message?.includes('User rejected')) {
        alert('Transaction cancelled');
      } else {
        alert(`Swap failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const flipTokens = () => {
    setInputToken(inputToken === 'SOL' ? 'TOKEN' : 'SOL');
    setInputAmount(outputAmount);
  };

  const handleMaxClick = () => {
    if (inputToken === 'SOL') {
      // Leave some SOL for fees (0.01 SOL)
      const maxSol = Math.max(0, walletBalance - 0.01);
      setInputAmount(maxSol.toFixed(4));
    } else {
      setInputAmount(tokenBalance.toString());
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Swap</h3>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !h-10 !text-sm" />
      </div>

      {/* From */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">From</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              Balance: {inputToken === 'SOL' ? walletBalance.toFixed(4) : tokenBalance.toFixed(2)}
            </span>
            {connected && (
              <button
                onClick={handleMaxClick}
                className="text-purple-400 hover:text-purple-300 text-xs font-semibold"
              >
                MAX
              </button>
            )}
          </div>
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
            ≈ ${(parseFloat(inputAmount) * (inputToken === 'SOL' ? solPrice : currentPrice)).toFixed(2)}
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
            Balance: {inputToken === 'SOL' ? tokenBalance.toFixed(2) : walletBalance.toFixed(4)}
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
            ≈ ${(parseFloat(outputAmount) * (inputToken === 'SOL' ? currentPrice : solPrice)).toFixed(2)}
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
        disabled={!inputAmount || isLoading || parseFloat(inputAmount) <= 0 || (!connected && inputAmount !== '')}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
          connected && inputAmount && !isLoading && parseFloat(inputAmount) > 0
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transform hover:scale-[1.02]'
            : !connected
            ? 'bg-gray-700 text-gray-400'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {!connected
          ? 'Connect Wallet to Swap'
          : !inputAmount || parseFloat(inputAmount) <= 0
          ? 'Enter Amount'
          : isLoading
          ? 'Processing Swap...'
          : priceImpact > 15
          ? `Swap Anyway (${priceImpact.toFixed(1)}% Impact!)`
          : `Swap ${inputToken === 'SOL' ? 'SOL' : tokenSymbol} for ${inputToken === 'SOL' ? tokenSymbol : 'SOL'}`}
      </button>

      {/* Warning for high price impact */}
      {priceImpact > 10 && inputAmount && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-400">
            ⚠️ High price impact! Consider reducing your trade size or increasing slippage tolerance.
          </p>
        </div>
      )}

      {/* Info for bonding curve tokens */}
      {isBondingCurve && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <p className="text-xs text-blue-400">
            🎯 This is a bonding curve token. Price increases as more people buy.
            Current bonding curve progress affects the price significantly.
          </p>
        </div>
      )}

      {/* Route info */}
      {quoteResponse && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Route Details:</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Route:</span>
              <span className="text-white">{quoteResponse.routePlan?.[0]?.swapInfo?.label || 'Direct'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Min Received:</span>
              <span className="text-white">
                {(quoteResponse.otherAmountThreshold / (10 ** (inputToken === 'SOL' ? tokenDecimals : 9))).toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}