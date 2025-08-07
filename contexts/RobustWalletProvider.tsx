'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { useMemo, useState, useEffect } from 'react';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// Custom connection that tries multiple RPCs
class FallbackConnection extends Connection {
  private fallbackEndpoints: string[];
  private currentEndpointIndex: number = 0;

  constructor(endpoints: string[]) {
    super(endpoints[0], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
    this.fallbackEndpoints = endpoints;
  }

  async getBalance(...args: any[]): Promise<any> {
    let lastError;
    
    // Try each endpoint until one works
    for (let i = 0; i < this.fallbackEndpoints.length; i++) {
      const index = (this.currentEndpointIndex + i) % this.fallbackEndpoints.length;
      const endpoint = this.fallbackEndpoints[index];
      
      try {
        // Update the internal RPC endpoint
        (this as any)._rpcEndpoint = endpoint;
        (this as any)._rpcClient._customHeaders = {};
        
        console.log(`Trying RPC ${index + 1}/${this.fallbackEndpoints.length}: ${endpoint}`);
        const result = await super.getBalance(...args);
        
        // If successful, remember this endpoint
        this.currentEndpointIndex = index;
        console.log(`Success with RPC: ${endpoint}`);
        return result;
      } catch (error: any) {
        console.error(`RPC ${endpoint} failed:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError || new Error('All RPC endpoints failed');
  }

  // Override other methods as needed
  async getSlot(...args: any[]): Promise<any> {
    return this.tryAllEndpoints('getSlot', args);
  }

  async getVersion(...args: any[]): Promise<any> {
    return this.tryAllEndpoints('getVersion', args);
  }

  private async tryAllEndpoints(method: string, args: any[]): Promise<any> {
    let lastError;
    
    for (let i = 0; i < this.fallbackEndpoints.length; i++) {
      const index = (this.currentEndpointIndex + i) % this.fallbackEndpoints.length;
      const endpoint = this.fallbackEndpoints[index];
      
      try {
        (this as any)._rpcEndpoint = endpoint;
        const result = await (super as any)[method](...args);
        this.currentEndpointIndex = index;
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    
    throw lastError;
  }
}

export function RobustWalletProvider({ children }: { children: React.ReactNode }) {
  // List of RPCs to try in order
  const endpoints = useMemo(() => [
    'https://rpc.ankr.com/solana', // Ankr - usually reliable
    'https://solana-mainnet.g.alchemy.com/v2/demo', // Alchemy demo
    'https://api.devnet.solana.com', // Fallback to devnet if needed (for testing)
    'https://solana.publicnode.com', // Public Node
    'https://mainnet.helius-rpc.com/?api-key=7c9b9446-d8d6-4c77-93d3-564bc1130ddc', // Helius
    'https://api.mainnet-beta.solana.com', // Official (rate limited)
  ], []);

  // Create connection with fallback support
  const connection = useMemo(() => {
    console.log('Initializing robust connection with fallback RPCs');
    return new FallbackConnection(endpoints);
  }, [endpoints]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoints[0]} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}