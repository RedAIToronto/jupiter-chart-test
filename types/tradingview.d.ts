// TradingView Widget Types
declare global {
  interface Window {
    TradingView: any;
  }
}

export interface IBasicDataFeed {
  onReady: (callback: (config: any) => void) => void;
  searchSymbols: (userInput: string, exchange: string, symbolType: string, onResultReadyCallback: (result: any[]) => void) => void;
  resolveSymbol: (symbolName: string, onSymbolResolvedCallback: (symbolInfo: any) => void, onResolveErrorCallback: (reason: string) => void) => void;
  getBars: (symbolInfo: any, resolution: string, periodParams: any, onHistoryCallback: (bars: any[], meta: any) => void, onErrorCallback: (error: string) => void) => void;
  subscribeBars: (symbolInfo: any, resolution: string, onRealtimeCallback: (bar: any) => void, subscriberUID: string, onResetCacheNeededCallback: () => void) => void;
  unsubscribeBars: (subscriberUID: string) => void;
}

export {};