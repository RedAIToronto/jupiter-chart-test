'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface DebugSwapProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  currentPrice: number;
}

export default function DebugSwap({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  currentPrice,
}: DebugSwapProps) {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, disconnecting } = useWallet();
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [balance, setBalance] = useState<number>(0);
  const [inputAmount, setInputAmount] = useState('');
  const [outputAmount, setOutputAmount] = useState('');
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debug connection info
  useEffect(() => {
    const info = {
      connected,
      connecting,
      disconnecting,
      publicKey: publicKey?.toBase58(),
      endpoint: connection?.rpcEndpoint,
      tokenAddress,
      tokenSymbol,
      currentPrice,
    };
    setDebugInfo(info);
    console.log('Debug Info:', info);
  }, [connected, connecting, disconnecting, publicKey, connection, tokenAddress, tokenSymbol, currentPrice]);

  // Fetch balance with detailed logging
  useEffect(() => {
    async function fetchBalance() {
      if (!connected || !publicKey || !connection) {
        console.log('Not fetching balance:', { connected, publicKey: !!publicKey, connection: !!connection });
        setBalance(0);
        return;
      }

      console.log('Fetching balance for:', publicKey.toBase58());
      
      try {
        const bal = await connection.getBalance(publicKey);
        const solBalance = bal / LAMPORTS_PER_SOL;
        console.log('Balance fetched:', { lamports: bal, sol: solBalance });
        setBalance(solBalance);
      } catch (error: any) {
        console.error('Balance fetch error:', error);
        setDebugInfo(prev => ({ ...prev, balanceError: error.message }));
      }
    }

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  // Calculate output
  useEffect(() => {
    if (!inputAmount || !currentPrice) {
      setOutputAmount('');
      return;
    }

    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      setOutputAmount('');
      return;
    }

    // Simple calculation for display
    const output = amount / currentPrice;
    setOutputAmount(output.toFixed(6));
  }, [inputAmount, currentPrice]);

  // Test Jupiter Quote API
  const testQuote = async () => {
    if (!inputAmount) {
      alert('Enter an amount first');
      return;
    }

    setIsLoading(true);
    
    try {
      const amount = Math.floor(parseFloat(inputAmount) * LAMPORTS_PER_SOL);
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = tokenAddress;
      
      const params = {
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: '100',
      };
      
      console.log('Quote params:', params);
      
      const url = `https://quote-api.jup.ag/v6/quote?${new URLSearchParams(params)}`;
      console.log('Fetching quote from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Quote response:', data);
      setQuoteData(data);
      
      if (data.error) {
        alert(`Quote error: ${data.error}`);
      } else if (data.outAmount) {
        const outAmount = parseInt(data.outAmount) / Math.pow(10, tokenDecimals);
        alert(`Quote successful!\nYou would receive: ${outAmount.toFixed(6)} ${tokenSymbol}`);
      }
    } catch (error: any) {
      console.error('Quote error:', error);
      alert(`Quote failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-4">Debug Swap Interface</h2>
      
      {/* Debug Info Panel */}
      <div className="bg-gray-800 rounded p-4 mb-4 text-xs font-mono">
        <div className="text-green-400 mb-2">CONNECTION STATUS:</div>
        <div className="text-gray-300">
          Connected: {connected ? '✅' : '❌'}<br/>
          Wallet: {publicKey ? `${publicKey.toBase58().slice(0, 8)}...` : 'None'}<br/>
          RPC: {connection?.rpcEndpoint || 'Not connected'}<br/>
          Balance: {balance.toFixed(4)} SOL<br/>
        </div>
        
        <div className="text-green-400 mt-4 mb-2">TOKEN INFO:</div>
        <div className="text-gray-300">
          Symbol: {tokenSymbol}<br/>
          Address: {tokenAddress.slice(0, 8)}...<br/>
          Decimals: {tokenDecimals}<br/>
          Price: ${currentPrice?.toFixed(8) || '0'}<br/>
        </div>

        {debugInfo.balanceError && (
          <div className="text-red-400 mt-4">
            Balance Error: {debugInfo.balanceError}
          </div>
        )}
      </div>

      {/* Wallet Connection */}
      <div className="mb-4">
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </div>

      {/* Input */}
      <div className="bg-gray-800 rounded p-4 mb-4">
        <div className="text-gray-400 text-sm mb-2">Input (SOL)</div>
        <input
          type="number"
          value={inputAmount}
          onChange={(e) => setInputAmount(e.target.value)}
          placeholder="0.00"
          className="bg-transparent text-white text-xl w-full outline-none"
          step="0.001"
        />
        <div className="text-gray-500 text-xs mt-1">
          Balance: {balance.toFixed(4)} SOL
        </div>
      </div>

      {/* Output */}
      <div className="bg-gray-800 rounded p-4 mb-4">
        <div className="text-gray-400 text-sm mb-2">Output ({tokenSymbol})</div>
        <input
          type="text"
          value={outputAmount}
          readOnly
          placeholder="0.00"
          className="bg-transparent text-white text-xl w-full outline-none"
        />
        <div className="text-gray-500 text-xs mt-1">
          Rate: 1 SOL = {currentPrice > 0 ? (1 / currentPrice).toFixed(2) : '0'} {tokenSymbol}
        </div>
      </div>

      {/* Test Buttons */}
      <div className="space-y-2">
        <button
          onClick={testQuote}
          disabled={isLoading || !inputAmount}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-semibold disabled:bg-gray-700"
        >
          {isLoading ? 'Testing Quote...' : 'Test Jupiter Quote API'}
        </button>
        
        <button
          onClick={async () => {
            if (!connection) return;
            try {
              const slot = await connection.getSlot();
              const version = await connection.getVersion();
              alert(`RPC Working!\nSlot: ${slot}\nVersion: ${JSON.stringify(version)}`);
            } catch (error: any) {
              alert(`RPC Error: ${error.message}`);
            }
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-semibold"
        >
          Test RPC Connection
        </button>
      </div>

      {/* Quote Data */}
      {quoteData && (
        <div className="bg-gray-800 rounded p-4 mt-4 text-xs">
          <div className="text-green-400 mb-2">Last Quote Result:</div>
          <pre className="text-gray-300 overflow-auto">
            {JSON.stringify(quoteData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}