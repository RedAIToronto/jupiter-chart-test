// TradingView Datafeed for Jupiter API
import { IBasicDataFeed } from '@/types/tradingview';

const CHART_INTERVALS: Record<string, string> = {
  '1': '1_MINUTE',
  '5': '5_MINUTE',
  '15': '15_MINUTE',
  '30': '30_MINUTE',
  '60': '1_HOUR',
  '240': '4_HOUR',
  '1D': '1_DAY',
  '1W': '1_WEEK',
};

const BASE_URL = 'https://datapi.jup.ag';

export function createDatafeed(tokenAddress: string, tokenSymbol: string): IBasicDataFeed {
  let lastBar: any = null;
  let subscriptionInterval: NodeJS.Timeout | null = null;

  return {
    onReady: (callback) => {
      setTimeout(() => {
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
          supports_marks: false,
          supports_timescale_marks: false,
          supports_time: true,
        });
      }, 0);
    },

    searchSymbols: (userInput, exchange, symbolType, onResultReadyCallback) => {
      onResultReadyCallback([]);
    },

    resolveSymbol: (symbolName, onSymbolResolvedCallback, onResolveErrorCallback) => {
      setTimeout(() => {
        onSymbolResolvedCallback({
          name: tokenSymbol,
          description: tokenSymbol,
          type: 'crypto',
          session: '24x7',
          timezone: 'Etc/UTC',
          ticker: tokenSymbol,
          exchange: 'Jupiter',
          minmov: 1,
          pricescale: 100000000, // For proper decimals
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
          volume_precision: 2,
          data_status: 'streaming',
          format: 'price',
        });
      }, 0);
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
      try {
        const interval = CHART_INTERVALS[resolution];
        if (!interval) {
          onErrorCallback('Unsupported resolution');
          return;
        }

        const from = periodParams.from * 1000;
        const to = periodParams.to * 1000;
        
        // Calculate how many candles we need
        let candles = periodParams.countBack || 300;
        
        const params = new URLSearchParams({
          interval,
          baseAsset: tokenAddress,
          from: from.toString(),
          to: to.toString(),
          type: 'price',
          candles: candles.toString(),
        });

        const response = await fetch(`${BASE_URL}/v2/charts/${tokenAddress}?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candles || data.candles.length === 0) {
          onHistoryCallback([], { noData: true });
          return;
        }

        const bars = data.candles.map((candle: any) => ({
          time: candle.time * 1000,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        }));

        // Store the last bar for real-time updates
        if (bars.length > 0) {
          lastBar = bars[bars.length - 1];
        }

        onHistoryCallback(bars, { noData: false });
      } catch (error) {
        console.error('getBars error:', error);
        onErrorCallback(error instanceof Error ? error.message : 'Unknown error');
      }
    },

    subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) => {
      // Poll for updates every 3 seconds for smooth updates without flashing
      subscriptionInterval = setInterval(async () => {
        try {
          const interval = CHART_INTERVALS[resolution];
          if (!interval || !lastBar) return;

          const now = Date.now();
          const from = lastBar.time;
          
          const params = new URLSearchParams({
            interval,
            baseAsset: tokenAddress,
            from: from.toString(),
            to: now.toString(),
            type: 'price',
            candles: '2',
          });

          const response = await fetch(`${BASE_URL}/v2/charts/${tokenAddress}?${params}`);
          
          if (!response.ok) return;

          const data = await response.json();
          
          if (data.candles && data.candles.length > 0) {
            const latestCandle = data.candles[data.candles.length - 1];
            const bar = {
              time: latestCandle.time * 1000,
              open: latestCandle.open,
              high: latestCandle.high,
              low: latestCandle.low,
              close: latestCandle.close,
              volume: latestCandle.volume,
            };
            
            if (bar.time >= lastBar.time) {
              lastBar = bar;
              onRealtimeCallback(bar);
            }
          }
        } catch (error) {
          console.error('Real-time update error:', error);
        }
      }, 3000); // 3 seconds for smooth natural updates without flashing
    },

    unsubscribeBars: (subscriberUID) => {
      if (subscriptionInterval) {
        clearInterval(subscriptionInterval);
        subscriptionInterval = null;
      }
    },
  };
}