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

export default function SwapInterfaceFixed({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  currentPrice,
  isBondingCurve = false,
}: SwapInterfaceProps) {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  
  const [inputToken, setInputToken] = useState<'SOL' | 'TOKEN'>('SOL');
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // 1% default
  const [isLoading, setIsLoading] = useState(false);
  const [priceImpact, setPriceImpact] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [solPrice, setSolPrice] = useState<number>(150);

  // Fetch SOL price from Jupiter Price API v6
  useEffect(() => {
    async function fetchSolPrice() {
      try {
        // Use Jupiter Price API v6 for SOL price
        const response = await fetch('https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112');
        const data = await response.json();
        
        if (data?.data?.So11111111111111111111111111111111111111112?.price) {
          const price = data.data.So11111111111111111111111111111111111111112.price;
          setSolPrice(price);
          console.log('SOL price updated:', price);
        }
      } catch (error) {
        console.log('Using fallback SOL price:', solPrice);
      }
    }
    
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    async function fetchBalance() {
      if (!connected || !publicKey || !connection) {
        setWalletBalance(0);
        return;
      }

      try {
        const balance = await connection.getBalance(publicKey);
        setWalletBalance(balance / 1e9);
      } catch (error) {
        console.log('Balance fetch error, will retry');
        setWalletBalance(0);
      }
    }

    fetchBalance();
    // Refresh every 5 seconds when connected
    const interval = setInterval(() => {
      if (connected) fetchBalance();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  // Calculate output amount
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
      const tokensOut = amount / currentPrice;
      setOutputAmount(tokensOut.toFixed(2));
      
      // Simple price impact calculation
      if (isBondingCurve) {
        const impact = Math.min((amount / 30) * 100, 99);
        setPriceImpact(impact);
      } else {
        setPriceImpact(amount > 10 ? 2.5 : amount > 1 ? 0.5 : 0.1);
      }
    } else {
      // Selling tokens for SOL
      const solOut = amount * currentPrice;
      setOutputAmount(solOut.toFixed(6));
      
      if (isBondingCurve) {
        const impact = Math.min((solOut / 30) * 100, 99);
        setPriceImpact(impact);
      } else {
        setPriceImpact(solOut > 10 ? 2.5 : solOut > 1 ? 0.5 : 0.1);
      }
    }
  }, [inputAmount, inputToken, currentPrice, isBondingCurve]);

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
      // Prepare swap parameters
      const inputMint = inputToken === 'SOL' 
        ? 'So11111111111111111111111111111111111111112' 
        : tokenAddress;
      const outputMint = inputToken === 'SOL' 
        ? tokenAddress 
        : 'So11111111111111111111111111111111111111112';
      const amount = Math.floor(parseFloat(inputAmount) * (10 ** (inputToken === 'SOL' ? 9 : tokenDecimals)));
      
      console.log('Getting quote...', { inputMint, outputMint, amount });
      
      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amount}&` +
        `slippageBps=${Math.floor(slippage * 100)}`
      );
      
      if (!quoteResponse.ok) {
        throw new Error('Failed to get quote');
      }
      
      const quoteData = await quoteResponse.json();
      
      if (!quoteData || quoteData.error) {
        throw new Error(quoteData?.error || 'Failed to get quote');
      }

      console.log('Quote received:', quoteData);

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      const swapData = await swapResponse.json();
      
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
      const maxSol = Math.max(0, walletBalance - 0.01);
      setInputAmount(maxSol.toFixed(4));
    } else {
      // For tokens, we'd need token balance (not implemented yet)
      setInputAmount('0');
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
          Connected: {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
          <br />
          Balance: {walletBalance.toFixed(4)} SOL
        </div>
      )}

      {/* From */}
      <div className="bg-gray-800 rounded-lg p-4 mb-2">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">From</span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">
              Balance: {inputToken === 'SOL' ? walletBalance.toFixed(4) : '0'}
            </span>
            {connected && walletBalance > 0 && inputToken === 'SOL' && (
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

      {/* High price impact warning */}
      {priceImpact > 10 && inputAmount && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
          <p className="text-xs text-red-400">
            ⚠️ High price impact! Consider smaller amount or higher slippage.
          </p>
        </div>
      )}
    </div>
  );
}