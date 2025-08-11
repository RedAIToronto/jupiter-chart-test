'use client';

import { useState, useEffect } from 'react';
import { getMeteoraDBCClient } from '@/lib/meteora-dbc-client';

interface BondingCurveProgressProps {
  tokenAddress: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function BondingCurveProgress({
  tokenAddress,
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 5000
}: BondingCurveProgressProps) {
  const [bondingData, setBondingData] = useState<{
    percentage: number;
    tokensSold: number;
    migrationThreshold: number;
    currentPrice: number;
    isComplete: boolean;
    loading: boolean;
  }>({
    percentage: 0,
    tokensSold: 0,
    migrationThreshold: 800000000,
    currentPrice: 0,
    isComplete: false,
    loading: true
  });
  
  useEffect(() => {
    const dbcClient = getMeteoraDBCClient();
    
    const fetchBondingCurve = async () => {
      try {
        const info = await dbcClient.getDBCTokenInfo(tokenAddress);
        
        if (info) {
          setBondingData({
            percentage: info.bondingCurvePercentage,
            tokensSold: info.tokensSold,
            migrationThreshold: info.migrationThreshold,
            currentPrice: info.currentPrice,
            isComplete: info.isComplete,
            loading: false
          });
        } else {
          setBondingData(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error fetching bonding curve:', error);
        setBondingData(prev => ({ ...prev, loading: false }));
      }
    };
    
    // Initial fetch
    fetchBondingCurve();
    
    // Set up auto-refresh if enabled
    let cleanup: (() => void) | null = null;
    
    if (autoRefresh) {
      cleanup = dbcClient.monitorBondingCurve(
        tokenAddress,
        (info) => {
          setBondingData({
            percentage: info.bondingCurvePercentage,
            tokensSold: info.tokensSold,
            migrationThreshold: info.migrationThreshold,
            currentPrice: info.currentPrice,
            isComplete: info.isComplete,
            loading: false
          });
        },
        refreshInterval
      ).then(fn => fn);
    }
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [tokenAddress, autoRefresh, refreshInterval]);
  
  if (bondingData.loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded-full"></div>
      </div>
    );
  }
  
  const getProgressColor = () => {
    if (bondingData.isComplete) return 'from-green-500 to-green-600';
    if (bondingData.percentage >= 75) return 'from-yellow-500 to-orange-500';
    if (bondingData.percentage >= 50) return 'from-blue-500 to-purple-500';
    return 'from-purple-600 to-pink-600';
  };
  
  const getStatusText = () => {
    if (bondingData.isComplete) return '✅ Migration Complete!';
    if (bondingData.percentage >= 90) return '🔥 Almost there!';
    if (bondingData.percentage >= 75) return '🚀 Pumping!';
    if (bondingData.percentage >= 50) return '📈 Growing strong';
    if (bondingData.percentage >= 25) return '🌱 Building momentum';
    return '🎯 Just started';
  };
  
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Bonding Curve Progress
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-bold text-white">
              {bondingData.percentage.toFixed(2)}%
            </span>
            <span className="text-sm text-gray-400">
              {getStatusText()}
            </span>
          </div>
        </div>
        {autoRefresh && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className={`absolute inset-0 bg-gradient-to-r ${getProgressColor()} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(bondingData.percentage, 100)}%` }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        </div>
        {/* Milestone markers */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {[25, 50, 75, 100].map((milestone) => (
            <div
              key={milestone}
              className={`text-xs font-semibold ${
                bondingData.percentage >= milestone ? 'text-white' : 'text-gray-600'
              }`}
              style={{ left: `${milestone}%`, position: 'absolute', transform: 'translateX(-50%)' }}
            >
              {milestone}%
            </div>
          ))}
        </div>
      </div>
      
      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 text-xs">Tokens Sold</div>
            <div className="text-white font-semibold">
              {bondingData.tokensSold > 0 
                ? `${(bondingData.tokensSold / 1000000).toFixed(2)}M`
                : 'N/A'
              }
            </div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 text-xs">Migration Target</div>
            <div className="text-white font-semibold">
              {(bondingData.migrationThreshold / 1000000).toFixed(0)}M
            </div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 text-xs">Current Price</div>
            <div className="text-white font-semibold">
              ${bondingData.currentPrice < 0.00001 
                ? bondingData.currentPrice.toExponential(2)
                : bondingData.currentPrice.toFixed(6)
              }
            </div>
          </div>
          <div className="bg-gray-800 rounded p-2">
            <div className="text-gray-400 text-xs">Status</div>
            <div className={`font-semibold ${
              bondingData.isComplete ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {bondingData.isComplete ? 'Migrated' : 'Active'}
            </div>
          </div>
        </div>
      )}
      
      {/* Migration countdown */}
      {!bondingData.isComplete && bondingData.percentage >= 80 && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
          <div className="text-xs text-yellow-400">
            ⚡ {(100 - bondingData.percentage).toFixed(2)}% until Raydium migration!
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for inline display
export function BondingCurveProgressCompact({ tokenAddress }: { tokenAddress: string }) {
  const [percentage, setPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPercentage = async () => {
      try {
        const dbcClient = getMeteoraDBCClient();
        const info = await dbcClient.getDBCTokenInfo(tokenAddress);
        if (info) {
          setPercentage(info.bondingCurvePercentage);
        }
      } catch (error) {
        console.error('Error fetching bonding curve:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPercentage();
  }, [tokenAddress]);
  
  if (loading) {
    return <span className="text-gray-500">Loading...</span>;
  }
  
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-gray-400">Bonding:</span>
      <div className="relative w-24 h-4 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-white">
        {percentage.toFixed(1)}%
      </span>
    </div>
  );
}