'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';

// Import wallet adapter CSS - critical for the modal to work
import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  // Using a public RPC endpoint that works reliably
  const endpoint = useMemo(() => {
    // Try these in order of reliability:
    // 1. Helius public endpoint (most reliable for Jupiter)
    // 2. Ankr public RPC
    // 3. Official Solana RPC (rate limited)
    
    // Using Helius public endpoint - best for Jupiter operations
    return 'https://mainnet.helius-rpc.com/?api-key=7c9b9446-d8d6-4c77-93d3-564bc1130ddc';
  }, []);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}