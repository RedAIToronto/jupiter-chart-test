'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaWalletProviderFixed({ children }: { children: React.ReactNode }) {
  // Create connection with custom config
  const endpoint = useMemo(() => {
    // List of public RPCs to try
    const rpcs = [
      // Best free RPCs for Jupiter operations:
      'https://api.mainnet-beta.solana.com',  // Official Solana
      'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy demo
      'https://rpc.ankr.com/solana', // Ankr
      'https://solana.publicnode.com', // Public Node
      'https://mainnet.helius-rpc.com/?api-key=7c9b9446-d8d6-4c77-93d3-564bc1130ddc', // Helius
    ];
    
    // Use Ankr or Alchemy - they don't have the 403 issue
    const selectedRpc = rpcs[2]; // Using Ankr - no rate limits
    console.log('Using RPC:', selectedRpc);
    return selectedRpc;
  }, []);

  // Create connection with custom settings
  const connection = useMemo(() => {
    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }, [endpoint]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}