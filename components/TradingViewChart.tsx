'use client';

import { useEffect, useRef, useState } from 'react';
import { createDatafeed } from '@/lib/datafeed';

interface TradingViewChartProps {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function TradingViewChart({ tokenAddress, tokenSymbol, tokenName }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scriptLoaded = false;

    const loadTradingView = () => {
      // Check if TradingView is already loaded
      if (window.TradingView) {
        initializeChart();
        return;
      }

      // Load TradingView library from Jupiter's CDN
      const script = document.createElement('script');
      script.src = 'https://static.jup.ag/tv/charting_library/charting_library.js';
      script.async = true;
      
      script.onload = () => {
        scriptLoaded = true;
        if (window.TradingView) {
          initializeChart();
        } else {
          setError('TradingView library failed to load');
          setIsLoading(false);
        }
      };

      script.onerror = () => {
        setError('Failed to load TradingView library');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    const initializeChart = () => {
      if (!containerRef.current || !window.TradingView) {
        return;
      }

      try {
        const widget = new window.TradingView.widget({
          // Basic configuration
          container: containerRef.current,
          locale: 'en',
          library_path: 'https://static.jup.ag/tv/charting_library/',
          datafeed: createDatafeed(tokenAddress, tokenSymbol),
          
          // Chart configuration
          symbol: tokenSymbol,
          interval: '5', // Default to 5 minutes
          fullscreen: false,
          autosize: true,
          
          // UI Configuration
          theme: 'dark',
          style: '1', // Candlestick chart
          timezone: 'Etc/UTC',
          
          // Features
          disabled_features: [
            'header_symbol_search',
            'header_compare',
            'display_market_status',
            'go_to_date',
            'header_screenshot',
          ],
          enabled_features: [
            'support_double_click_hightlight',
            'side_toolbar_in_fullscreen_mode',
            'header_in_fullscreen_mode',
          ],
          
          // Overrides for dark theme
          overrides: {
            'paneProperties.background': '#0a0a0a',
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': '#1a1a1a',
            'paneProperties.horzGridProperties.color': '#1a1a1a',
            'scalesProperties.textColor': '#AAA',
            'mainSeriesProperties.candleStyle.upColor': '#00FF88',
            'mainSeriesProperties.candleStyle.downColor': '#FF3333',
            'mainSeriesProperties.candleStyle.wickUpColor': '#00FF88',
            'mainSeriesProperties.candleStyle.wickDownColor': '#FF3333',
            'mainSeriesProperties.candleStyle.borderUpColor': '#00FF88',
            'mainSeriesProperties.candleStyle.borderDownColor': '#FF3333',
          },
          
          // Custom CSS
          custom_css_url: 'https://static.jup.ag/tv/css/tokenchart.css',
        });

        widgetRef.current = widget;
        
        widget.onChartReady(() => {
          setIsLoading(false);
          
          // Add volume study by default
          widget.activeChart().createStudy('Volume', false, false);
        });
      } catch (err) {
        console.error('Failed to initialize TradingView:', err);
        setError('Failed to initialize chart');
        setIsLoading(false);
      }
    };

    loadTradingView();

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          console.error('Error removing widget:', e);
        }
      }
    };
  }, [tokenAddress, tokenSymbol]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-900 rounded-lg">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-10">
          <div className="text-white">Loading TradingView Chart...</div>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="h-[600px] bg-gray-900 rounded-lg overflow-hidden"
      />
    </div>
  );
}