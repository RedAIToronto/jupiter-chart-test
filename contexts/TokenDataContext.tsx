'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { TokenInfo } from '@/lib/jupiter-api';
import { getCachedTokenInfo, getCachedChartData, cacheManager } from '@/lib/cache-manager';

interface TokenData {
  info: TokenInfo | null;
  priceHistory: number[];
  lastUpdate: Date | null;
  isUpdating: boolean;
  error: string | null;
}

interface TokenDataContextType {
  tokens: Map<string, TokenData>;
  subscribeToToken: (address: string) => void;
  unsubscribeFromToken: (address: string) => void;
  getTokenData: (address: string) => TokenData | undefined;
  cacheStats: any;
}

const TokenDataContext = createContext<TokenDataContextType | undefined>(undefined);

export function TokenDataProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<Map<string, TokenData>>(new Map());
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set());
  const [cacheStats, setCacheStats] = useState<any>({});
  const [updateInterval, setUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // Smart update scheduler - staggers requests
  const updateTokenData = useCallback(async (tokenAddresses: string[]) => {
    const STAGGER_DELAY = 500; // 500ms between each token request
    
    for (let i = 0; i < tokenAddresses.length; i++) {
      const address = tokenAddresses[i];
      
      // Mark as updating
      setTokens(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(address) || {
          info: null,
          priceHistory: [],
          lastUpdate: null,
          isUpdating: false,
          error: null,
        };
        newMap.set(address, { ...existing, isUpdating: true });
        return newMap;
      });

      // Fetch data with cache
      try {
        const info = await getCachedTokenInfo(address);
        
        setTokens(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(address) || {
            info: null,
            priceHistory: [],
            lastUpdate: null,
            isUpdating: false,
            error: null,
          };
          
          // Add to price history
          const newHistory = [...existing.priceHistory];
          if (info?.baseAsset.usdPrice) {
            newHistory.push(info.baseAsset.usdPrice);
            if (newHistory.length > 20) newHistory.shift(); // Keep last 20
          }
          
          newMap.set(address, {
            info: info,
            priceHistory: newHistory,
            lastUpdate: new Date(),
            isUpdating: false,
            error: info ? null : 'Token not found',
          });
          return newMap;
        });
      } catch (error) {
        setTokens(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(address) || {
            info: null,
            priceHistory: [],
            lastUpdate: null,
            isUpdating: false,
            error: null,
          };
          newMap.set(address, {
            ...existing,
            isUpdating: false,
            error: 'Failed to fetch data',
          });
          return newMap;
        });
      }

      // Stagger requests
      if (i < tokenAddresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
      }
    }

    // Update cache stats
    setCacheStats(cacheManager.getStats());
  }, []);

  // Subscribe to a token
  const subscribeToToken = useCallback((address: string) => {
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.add(address);
      return newSet;
    });
  }, []);

  // Unsubscribe from a token
  const unsubscribeFromToken = useCallback((address: string) => {
    setSubscriptions(prev => {
      const newSet = new Set(prev);
      newSet.delete(address);
      return newSet;
    });
  }, []);

  // Get token data
  const getTokenData = useCallback((address: string): TokenData | undefined => {
    return tokens.get(address);
  }, [tokens]);

  // Set up update interval
  useEffect(() => {
    if (subscriptions.size === 0) {
      if (updateInterval) {
        clearInterval(updateInterval);
        setUpdateInterval(null);
      }
      return;
    }

    // Initial update
    updateTokenData(Array.from(subscriptions));

    // Set up smart interval based on number of subscriptions
    const interval = Math.max(5000, subscriptions.size * 1000); // Min 5s, +1s per token
    
    const intervalId = setInterval(() => {
      updateTokenData(Array.from(subscriptions));
    }, interval);

    setUpdateInterval(intervalId);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [subscriptions, updateTokenData]);

  const value: TokenDataContextType = {
    tokens,
    subscribeToToken,
    unsubscribeFromToken,
    getTokenData,
    cacheStats,
  };

  return (
    <TokenDataContext.Provider value={value}>
      {children}
    </TokenDataContext.Provider>
  );
}

export function useTokenData(tokenAddress: string) {
  const context = useContext(TokenDataContext);
  if (!context) {
    throw new Error('useTokenData must be used within TokenDataProvider');
  }

  const { subscribeToToken, unsubscribeFromToken, getTokenData } = context;

  useEffect(() => {
    subscribeToToken(tokenAddress);
    return () => unsubscribeFromToken(tokenAddress);
  }, [tokenAddress, subscribeToToken, unsubscribeFromToken]);

  return getTokenData(tokenAddress);
}

export function useCacheStats() {
  const context = useContext(TokenDataContext);
  if (!context) {
    throw new Error('useCacheStats must be used within TokenDataProvider');
  }
  return context.cacheStats;
}