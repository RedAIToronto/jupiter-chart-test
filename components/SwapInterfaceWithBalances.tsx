'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, VersionedTransaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getJupiterClient } from '@/lib/jupiter-client';

interface SwapInterfaceProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  currentPrice: number;
  isBondingCurve?: boolean;
  onSwapComplete?: () => void; // Callback to refresh charts
}

export default function SwapInterfaceWithBalances({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  currentPrice,
  isBondingCurve = false,
  onSwapComplete,
}: SwapInterfaceProps) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  
  const [inputToken, setInputToken] = useState<'SOL' | 'TOKEN'>('SOL');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(150);
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh all data
  const refreshAllData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    if (onSwapComplete) {
      onSwapComplete();
    }
  }, [onSwapComplete]);

  // Fetch token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection || !tokenAddress) {
      setTokenBalance(0);
      return;
    }

    try {
      console.log('Fetching token balance for:', tokenAddress);
      
      // Get all token accounts for this wallet
      const response = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { mint: new PublicKey(tokenAddress) }
      );

      if (response.value.length > 0) {
        const balance = response.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
        console.log('Token balance found:', balance, tokenSymbol);
        setTokenBalance(balance);
      } else {
        console.log('No token account found for:', tokenSymbol);
        setTokenBalance(0);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setTokenBalance(0);
    }
  }, [connected, publicKey, connection, tokenAddress, tokenSymbol]);

  // Fetch SOL balance
  const fetchSolBalance = useCallback(async () => {
    if (!connected || !publicKey || !connection) {
      setSolBalance(0);
      return;
    }

    try {
      const balance = await connection.getBalance(publicKey);
      const sol = balance / LAMPORTS_PER_SOL;
      console.log('SOL balance:', sol);
      setSolBalance(sol);
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      setSolBalance(0);
    }
  }, [connected, publicKey, connection]);

  // Fetch all balances
  const fetchBalances = useCallback(async () => {
    await Promise.all([
      fetchSolBalance(),
      fetchTokenBalance()
    ]);
  }, [fetchSolBalance, fetchTokenBalance]);

  // Fetch balances on mount and when wallet/token changes
  useEffect(() => {
    fetchBalances();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchBalances, 5000);
    return () => clearInterval(interval);
  }, [fetchBalances, refreshKey]);

  // Fetch SOL price
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        const jupiterClient = getJupiterClient();
        const price = await jupiterClient.getSolPrice();
        setSolPrice(price);
      } catch (error) {
        console.log('Using fallback SOL price:', error);
        setSolPrice(165); // Fallback price
      }
    }
    
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate output amount with proper SOL/token conversion
  useEffect(() => {
    if (!inputAmount || !currentPrice) {
      setOutputAmount('');
      setPriceImpact(0);
      return;
    }
    
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      setOutputAmount('');
      setPriceImpact(0);
      return;
    }

    if (inputToken === 'SOL') {
      // Buying tokens with SOL
      // Price is in USD per token, SOL is in USD
      // tokens = (SOL * SOL_price_USD) / token_price_USD
      const solValueUsd = amount * solPrice;
      const tokensOut = solValueUsd / currentPrice;
      setOutputAmount(tokensOut.toFixed(2));
      
      if (isBondingCurve) {
        const impact = Math.min((amount / 30) * 100, 99);
        setPriceImpact(impact);
      } else {
        setPriceImpact(amount > 10 ? 2.5 : amount > 1 ? 0.5 : 0.1);
      }
    } else {
      // Selling tokens for SOL
      // Price is in USD per token
      // SOL = (tokens * token_price_USD) / SOL_price_USD
      const tokenValueUsd = amount * currentPrice;
      const solOut = tokenValueUsd / solPrice;
      setOutputAmount(solOut.toFixed(6));
      
      if (isBondingCurve) {
        const impact = Math.min((solOut / 30) * 100, 99);
        setPriceImpact(impact);
      } else {
        setPriceImpact(solOut > 10 ? 2.5 : solOut > 1 ? 0.5 : 0.1);
      }
    }
  }, [inputAmount, inputToken, currentPrice, solPrice, isBondingCurve]);

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
      const inputMint = inputToken === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : tokenAddress;
      const outputMint = inputToken === 'SOL' 
        ? tokenAddress 
        : 'So11111111111111111111111111111111111111112';
      const amount = Math.floor(parseFloat(inputAmount) * (10 ** (inputToken === 'SOL' ? 9 : tokenDecimals)));
      
      console.log('Getting quote...', { inputMint, outputMint, amount });
      
      // Get quote using scalable Jupiter client
      const jupiterClient = getJupiterClient();
      const quoteData = await jupiterClient.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: Math.floor(slippage * 100)
      });
      
      if (!quoteData || quoteData.error) {
        throw new Error(quoteData?.error || 'Failed to get quote');
      }

      console.log('Quote received:', quoteData);

      // Get swap transaction using scalable Jupiter client (reuse existing instance)
      const swapData = await jupiterClient.getSwapTransaction({
        quoteResponse: quoteData,
        userPublicKey: publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      });
      
      if (!swapData?.swapTransaction) {
        throw new Error('Failed to create swap transaction');
      }

      // Deserialize and send transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');

      alert(`Swap successful! 🎉\n\nTransaction: ${signature}\n\nView on Solscan:\nhttps://solscan.io/tx/${signature}`);
      
      // Reset form
      setInputAmount('');
      setOutputAmount('');
      
      // IMPORTANT: Refresh balances and charts immediately
      setTimeout(() => {
        fetchBalances();
        refreshAllData();
      }, 1000);
      
      // And again after 3 seconds to catch on-chain updates
      setTimeout(() => {
        fetchBalances();
        refreshAllData();
      }, 3000);
      
    } catch (error: any) {
      console.error('Swap error:', error);
      
      if (error.message?.includes('User rejected')) {
        // User cancelled, no alert needed
      } else if (error.message?.includes('insufficient')) {
        alert('Insufficient balance for this swap');
      } else if (error.message?.includes('slippage')) {
        alert('Price moved too much. Try increasing slippage tolerance');
      } else {
        alert(`Swap failed: ${error.message || 'Please try again'}`);
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
      // Leave 0.01 SOL for fees
      const maxSol = Math.max(0, solBalance - 0.01);
      setInputAmount(maxSol.toFixed(4));
    } else {
      // Use full token balance
      setInputAmount(tokenBalance.toString());
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Swap</h3>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !h-10 !text-sm" />
      </div>

      {/* Connection status */}
      {connected && (
        <div className="bg-gray-800 rounded p-2 mb-4 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>SOL Balance:</span>
            <span className="text-white">{solBalance.toFixed(4)} SOL</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>{tokenSymbol} Balance:</span>
            <span className="text-white">{tokenBalance.toFixed(2)} {tokenSymbol}</span>
          </div>
        </div>
      )}

      {/* From */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">From</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              Balance: {inputToken === 'SOL' ? solBalance.toFixed(4) : tokenBalance.toFixed(2)}
            </span>
            {connected && (inputToken === 'SOL' ? solBalance > 0 : tokenBalance > 0) && (
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

      {/* Swap direction */}
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
            Balance: {inputToken === 'SOL' ? tokenBalance.toFixed(2) : solBalance.toFixed(4)}
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

      {/* Swap details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Rate</span>
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
          <span className="text-gray-400">Slippage</span>
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
      </div>

      {/* Swap button */}
      <button
        onClick={handleSwap}
        disabled={!inputAmount || isLoading || parseFloat(inputAmount) <= 0}
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
          ? 'Processing...'
          : `Swap ${inputToken === 'SOL' ? 'SOL' : tokenSymbol} for ${inputToken === 'SOL' ? tokenSymbol : 'SOL'}`}
      </button>

    </div>
  );
}