'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

interface Holder {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
  isDevWallet?: boolean;
  isBondingCurve?: boolean;
}

interface HoldersListProps {
  tokenAddress: string;
  totalSupply?: number;
  showCount?: number;
}

export default function HoldersList({ 
  tokenAddress, 
  totalSupply = 1000000000,
  showCount = 20 
}: HoldersListProps) {
  const [holders, setHolders] = useState<Holder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalHolders, setTotalHolders] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchHolders();
  }, [tokenAddress]);

  const fetchHolders = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch from Helius or similar API that provides holder data
      // For now, we'll use Jupiter's API and simulate holder data
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${tokenAddress}/balances?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY || 'demo'}`
      ).catch(() => null);

      if (!response || !response.ok) {
        // Fallback: Use RPC to get token accounts
        const connection = new Connection(
          process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 
          process.env.NEXT_PUBLIC_RPC_URL || 
          'https://mainnet.helius-rpc.com/?api-key=a5804a30-0390-4233-a0b8-71ed67be00a6'
        );
        
        const tokenAccounts = await connection.getParsedProgramAccounts(
          new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
          {
            filters: [
              { dataSize: 165 },
              {
                memcmp: {
                  offset: 0,
                  bytes: tokenAddress,
                },
              },
            ],
          }
        );

        const holdersData: Holder[] = tokenAccounts
          .map((account, index) => {
            const parsed = account.account.data as any;
            const balance = parsed?.parsed?.info?.tokenAmount?.uiAmount || 0;
            const owner = parsed?.parsed?.info?.owner || account.pubkey.toString();
            
            return {
              address: owner,
              balance: balance,
              percentage: (balance / totalSupply) * 100,
              rank: index + 1,
              isDevWallet: index === 0, // First wallet often dev
              isBondingCurve: owner.includes('curv') || owner.includes('pool'),
            };
          })
          .filter(h => h.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, showCount);

        setHolders(holdersData);
        setTotalHolders(tokenAccounts.length);
      } else {
        const data = await response.json();
        // Parse Helius response
        const holdersData = data.holders?.map((h: any, index: number) => ({
          address: h.owner,
          balance: h.amount / Math.pow(10, data.decimals || 9),
          percentage: (h.amount / totalSupply) * 100,
          rank: index + 1,
          isDevWallet: index === 0,
          isBondingCurve: h.owner.includes('curv') || h.owner.includes('pool'),
        })) || [];

        setHolders(holdersData);
        setTotalHolders(data.total_holders || holdersData.length);
      }
    } catch (err) {
      console.error('Error fetching holders:', err);
      
      // Mock data for demonstration
      const mockHolders: Holder[] = [
        {
          address: '7pptQp...HHHdev',
          balance: 100000000,
          percentage: 10.0,
          rank: 1,
          isDevWallet: true,
        },
        {
          address: 'CurveP...ool123',
          balance: 80000000,
          percentage: 8.0,
          rank: 2,
          isBondingCurve: true,
        },
        {
          address: '9kLm3x...whale1',
          balance: 50000000,
          percentage: 5.0,
          rank: 3,
        },
        {
          address: 'Hx7j9K...holder',
          balance: 25000000,
          percentage: 2.5,
          rank: 4,
        },
        {
          address: 'Qw8mNp...trader',
          balance: 15000000,
          percentage: 1.5,
          rank: 5,
        },
      ];
      
      setHolders(mockHolders);
      setTotalHolders(100);
      setError('Using simulated data - Connect RPC for real data');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatAddress = (address: string): string => {
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  };

  const formatBalance = (balance: number): string => {
    if (balance >= 1000000) return `${(balance / 1000000).toFixed(2)}M`;
    if (balance >= 1000) return `${(balance / 1000).toFixed(2)}K`;
    return balance.toFixed(2);
  };

  const getHolderBadge = (holder: Holder) => {
    if (holder.isDevWallet) return { text: 'DEV', color: 'bg-purple-600' };
    if (holder.isBondingCurve) return { text: 'POOL', color: 'bg-blue-600' };
    if (holder.percentage > 5) return { text: 'WHALE', color: 'bg-orange-600' };
    if (holder.percentage > 1) return { text: 'LARGE', color: 'bg-green-600' };
    return null;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-3 border-b border-gray-700">
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          👥 Top Holders ({totalHolders} total)
        </h3>
        <button
          onClick={fetchHolders}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="text-yellow-400 text-sm mb-3 p-2 bg-yellow-900/20 rounded">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700">
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Address</div>
          <div className="col-span-3 text-right">Balance</div>
          <div className="col-span-2 text-right">Share</div>
          <div className="col-span-1"></div>
        </div>

        {/* Holders List */}
        {holders.map((holder) => {
          const badge = getHolderBadge(holder);
          return (
            <div
              key={holder.address}
              className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-gray-800 rounded transition-colors"
            >
              {/* Rank */}
              <div className="col-span-1 text-sm text-gray-400">
                #{holder.rank}
              </div>

              {/* Address with badges */}
              <div className="col-span-5 flex items-center gap-2">
                <button
                  onClick={() => copyAddress(holder.address)}
                  className="text-sm font-mono text-blue-400 hover:text-blue-300"
                >
                  {formatAddress(holder.address)}
                </button>
                {badge && (
                  <span className={`text-xs px-2 py-0.5 rounded ${badge.color} text-white`}>
                    {badge.text}
                  </span>
                )}
                {copied === holder.address && (
                  <span className="text-xs text-green-400">✓ Copied</span>
                )}
              </div>

              {/* Balance */}
              <div className="col-span-3 text-right text-sm text-white">
                {formatBalance(holder.balance)}
              </div>

              {/* Percentage */}
              <div className="col-span-2 text-right">
                <span className={`text-sm font-semibold ${
                  holder.percentage > 5 ? 'text-orange-400' :
                  holder.percentage > 1 ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {holder.percentage.toFixed(2)}%
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 text-right">
                <a
                  href={`https://solscan.io/account/${holder.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                  title="View on Solscan"
                >
                  🔗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Total Holders:</span>
          <span className="ml-2 text-white font-semibold">{totalHolders}</span>
        </div>
        <div>
          <span className="text-gray-400">Top 10 Own:</span>
          <span className="ml-2 text-white font-semibold">
            {holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0).toFixed(1)}%
          </span>
        </div>
        <div>
          <span className="text-gray-400">Distribution:</span>
          <span className="ml-2 text-white font-semibold">
            {holders.filter(h => h.percentage > 1).length > 5 ? 'Concentrated' : 'Distributed'}
          </span>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="mt-4">
        <div className="text-xs text-gray-400 mb-2">Ownership Distribution</div>
        <div className="h-4 bg-gray-800 rounded-full overflow-hidden flex">
          {holders.slice(0, 10).map((holder, index) => (
            <div
              key={holder.address}
              className={`h-full ${
                index % 2 === 0 ? 'bg-purple-600' : 'bg-blue-600'
              }`}
              style={{ width: `${holder.percentage}%` }}
              title={`${formatAddress(holder.address)}: ${holder.percentage.toFixed(2)}%`}
            />
          ))}
          <div className="h-full bg-gray-700 flex-1" title="Others" />
        </div>
      </div>
    </div>
  );
}