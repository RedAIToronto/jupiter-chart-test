# 🚀 MASTER DOCUMENTATION - Jupiter Chart & Meteora DBC Integration

## Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [API Endpoints](#api-endpoints)
4. [Bonding Curve System](#bonding-curve-system)
5. [Server Architecture](#server-architecture)
6. [Performance Optimizations](#performance-optimizations)
7. [Data Structures](#data-structures)
8. [Frontend Integration](#frontend-integration)
9. [WebSocket/SSE Implementation](#websocketsse-implementation)
10. [Caching Strategy](#caching-strategy)
11. [Error Handling](#error-handling)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Get Bonding Curve Percentage (Direct)
```javascript
// Fastest way to get bonding curve %
const token = '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM';
const response = await fetch(`https://datapi.jup.ag/v1/pools?assetIds=${token}`);
const data = await response.json();
const bondingPercentage = (data.pools[0].bondingCurve || 0) * 100;
console.log(`${bondingPercentage}%`); // 26.85%
```

### Start Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit
http://localhost:3003
http://localhost:3003/bonding-demo  # Bonding curve demo
```

---

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     EXTERNAL APIS                        │
├──────────────┬────────────────┬────────────────────────┤
│  Jupiter API │  DexScreener   │   Meteora DBC          │
│  (Price/Vol) │   (Fallback)   │  (Bonding Curves)      │
└──────┬───────┴────────┬───────┴───────────┬────────────┘
       │                 │                    │
       └─────────────────┼────────────────────┘
                         │
                    ┌────▼─────┐
                    │  SERVER  │ ← Rate Limit Protection
                    │  (Cache) │ ← Data Aggregation
                    └────┬─────┘
                         │
                 WebSocket / SSE
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    Client 1        Client 2        Client N
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript
- **State**: Jotai, React Context
- **Styling**: Tailwind CSS 4
- **Charts**: TradingView Lightweight Charts
- **Blockchain**: Solana Web3.js, Jupiter API
- **Real-time**: WebSocket / Server-Sent Events
- **Caching**: Multi-layer (Hot/Memory/Local)

---

## API Endpoints

### 1. Jupiter Data API (Primary)
```javascript
// Base URL
const BASE_URL = 'https://datapi.jup.ag';

// Get pool/token data (NO AUTH REQUIRED)
GET /v1/pools?assetIds={token1},{token2},{token3}

// Response
{
  "pools": [{
    "id": "tokenAddress",
    "dex": "met-dbc",              // DEX type
    "bondingCurve": 0.2685,         // ← BONDING % (multiply by 100)
    "liquidity": 713.67,            // USD liquidity
    "volume24h": 708.66,            // 24h volume
    "baseAsset": {
      "symbol": "V",
      "name": "Voice",
      "usdPrice": 0.00000613,
      "mcap": 6131.34,
      "holderCount": 3,
      "stats24h": {
        "priceChange": 19.06,
        "holderChange": 200,
        "buyVolume": 708.66
      }
    }
  }]
}
```

### 2. Jupiter Quote API (Swaps)
```javascript
// Get swap quote (REQUIRES API KEY for higher limits)
GET https://quote-api.jup.ag/v6/quote
  ?inputMint={inputToken}
  &outputMint={outputToken}
  &amount={amount}
  &slippageBps={slippage}

Headers: {
  'x-api-key': 'your-api-key'  // Optional for public tier
}
```

### 3. Jupiter Price API
```javascript
// Get token prices (NO AUTH)
GET https://api.jup.ag/price/v3?ids={token1},{token2}

// Response
{
  "data": {
    "So11111111111111111111111111111111111111112": {
      "price": 165.50
    }
  }
}
```

### 4. DexScreener API (Fallback)
```javascript
// Alternative data source
GET https://api.dexscreener.com/latest/dex/tokens/{tokenAddress}

// Response
{
  "pairs": [{
    "dexId": "meteoradbc",
    "priceUsd": "0.00000613",
    "liquidity": { "usd": 713.67 },
    "volume": { "h24": 708.66 }
  }]
}
```

---

## Bonding Curve System

### Understanding Meteora DBC

#### What is Bonding Curve?
- **0%**: Token just launched, minimal trading
- **100%**: Migration threshold reached (usually 800M tokens sold)
- **Post-100%**: Automatically migrates to Raydium

#### Bonding Curve Stages
| Percentage | Status | Description | Indicator |
|------------|--------|-------------|-----------|
| 0% | Just Started | Fresh launch | 🎯 |
| 1-25% | Early Stage | Initial accumulation | 🌱 |
| 25-50% | Building Momentum | Growing interest | 📈 |
| 50-75% | Growing Strong | Active trading | 🚀 |
| 75-90% | Pumping | High activity | 🔥 |
| 90-99% | Almost There | Near migration | ⚡ |
| 100% | Complete | Migrated to Raydium | ✅ |

### Fetching Bonding Curve Data

#### Method 1: Direct API Call
```javascript
async function getBondingCurve(tokenAddress) {
  const response = await fetch(
    `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
  );
  const data = await response.json();
  
  if (data.pools?.[0]?.dex === 'met-dbc') {
    return {
      percentage: (data.pools[0].bondingCurve || 0) * 100,
      liquidity: data.pools[0].liquidity,
      volume24h: data.pools[0].volume24h,
      holders: data.pools[0].baseAsset?.holderCount
    };
  }
  return null;
}
```

#### Method 2: Using Our Client Library
```javascript
import { getMeteoraDBCClient } from '@/lib/meteora-dbc-client';

const dbcClient = getMeteoraDBCClient();
const percentage = await dbcClient.getBondingCurvePercentage(tokenAddress);
const fullInfo = await dbcClient.getDBCTokenInfo(tokenAddress);
```

#### Method 3: React Component
```jsx
import BondingCurveProgress from '@/components/BondingCurveProgress';

<BondingCurveProgress 
  tokenAddress="7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM"
  showDetails={true}
  autoRefresh={true}
  refreshInterval={5000}
/>
```

---

## Server Architecture

### Centralized Price Feed Server

#### Why Server-Side?
- **Rate Limiting**: 1 server request serves 1000s of clients
- **Cost**: Reduces API calls by 99%
- **Performance**: Instant updates for all clients
- **Reliability**: Fallback mechanisms

#### Implementation

##### 1. Basic Express Server
```javascript
const express = require('express');
const app = express();

class PriceFeedManager {
  constructor() {
    this.cache = new Map();
    this.updateInterval = 5000; // 5 seconds
    this.tokens = [
      '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM',
      'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw',
      // Add all tokens you want to track
    ];
    
    this.startUpdating();
  }
  
  async startUpdating() {
    setInterval(async () => {
      try {
        // Single batch request for all tokens
        const response = await fetch(
          `https://datapi.jup.ag/v1/pools?assetIds=${this.tokens.join(',')}`
        );
        const data = await response.json();
        
        // Update cache
        data.pools.forEach(pool => {
          this.cache.set(pool.id, {
            symbol: pool.baseAsset?.symbol,
            bondingCurve: (pool.bondingCurve || 0) * 100,
            price: pool.baseAsset?.usdPrice,
            liquidity: pool.liquidity,
            volume24h: pool.volume24h,
            holders: pool.baseAsset?.holderCount,
            priceChange24h: pool.baseAsset?.stats24h?.priceChange,
            timestamp: Date.now()
          });
        });
        
        console.log(`Updated ${this.cache.size} tokens`);
        
      } catch (error) {
        console.error('Update error:', error);
      }
    }, this.updateInterval);
  }
  
  getPrice(tokenAddress) {
    return this.cache.get(tokenAddress);
  }
  
  getAllPrices() {
    return Object.fromEntries(this.cache);
  }
}

const priceFeed = new PriceFeedManager();

// REST endpoint
app.get('/api/prices', (req, res) => {
  res.json(priceFeed.getAllPrices());
});

app.get('/api/prices/:token', (req, res) => {
  const data = priceFeed.getPrice(req.params.token);
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: 'Token not found' });
  }
});
```

##### 2. WebSocket Server
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

class WebSocketPriceFeed extends PriceFeedManager {
  constructor() {
    super();
    this.clients = new Set();
  }
  
  async startUpdating() {
    setInterval(async () => {
      await this.updatePrices();
      this.broadcast();
    }, this.updateInterval);
  }
  
  broadcast() {
    const data = this.getAllPrices();
    const message = JSON.stringify({
      type: 'price-update',
      timestamp: Date.now(),
      data
    });
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  addClient(ws) {
    this.clients.add(ws);
    
    // Send initial data
    ws.send(JSON.stringify({
      type: 'initial',
      data: this.getAllPrices()
    }));
    
    ws.on('close', () => {
      this.clients.delete(ws);
    });
  }
}

const wsFeed = new WebSocketPriceFeed();

wss.on('connection', (ws) => {
  wsFeed.addClient(ws);
});
```

##### 3. Server-Sent Events (SSE)
```javascript
// Simpler than WebSocket for one-way data
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  const sendUpdate = () => {
    const data = priceFeed.getAllPrices();
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Send initial data
  sendUpdate();
  
  // Send updates every 5 seconds
  const interval = setInterval(sendUpdate, 5000);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});
```

#### Client Connection

##### WebSocket Client
```javascript
class PriceClient {
  constructor() {
    this.prices = {};
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket('ws://localhost:8080');
    
    this.ws.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      this.prices = data;
      this.onPricesUpdate(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setTimeout(() => this.connect(), 5000); // Reconnect
    };
  }
  
  onPricesUpdate(prices) {
    // Update your UI here
    Object.entries(prices).forEach(([token, data]) => {
      console.log(`${data.symbol}: $${data.price} (${data.bondingCurve}%)`);
    });
  }
}
```

##### SSE Client
```javascript
const eventSource = new EventSource('/api/stream');

eventSource.onmessage = (event) => {
  const prices = JSON.parse(event.data);
  updateUI(prices);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  // Auto-reconnects
};
```

---

## Performance Optimizations

### 1. Multi-Layer Cache System
```javascript
class UltraFastCache {
  constructor() {
    this.l1Cache = new Map(); // Hot cache (<1ms)
    this.l2Cache = new Map(); // Memory cache (<10ms)
    this.l1TTL = 1000;        // 1 second
    this.l2TTL = 10000;       // 10 seconds
  }
  
  get(key) {
    // Check L1 (hot)
    const l1 = this.l1Cache.get(key);
    if (l1 && Date.now() - l1.timestamp < this.l1TTL) {
      return l1.data;
    }
    
    // Check L2 (memory)
    const l2 = this.l2Cache.get(key);
    if (l2 && Date.now() - l2.timestamp < this.l2TTL) {
      // Promote to L1
      this.l1Cache.set(key, l2);
      return l2.data;
    }
    
    return null;
  }
  
  set(key, data) {
    const entry = { data, timestamp: Date.now() };
    this.l1Cache.set(key, entry);
    this.l2Cache.set(key, entry);
    
    // Cleanup old entries
    if (this.l1Cache.size > 100) {
      const oldestKey = this.l1Cache.keys().next().value;
      this.l1Cache.delete(oldestKey);
    }
  }
}
```

### 2. Request Batching
```javascript
class BatchRequestManager {
  constructor() {
    this.queue = [];
    this.batchDelay = 50; // 50ms debounce
    this.maxBatchSize = 20;
    this.timer = null;
  }
  
  async request(tokenAddress) {
    return new Promise((resolve, reject) => {
      this.queue.push({ tokenAddress, resolve, reject });
      
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else {
        this.scheduleFlush();
      }
    });
  }
  
  scheduleFlush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.batchDelay);
  }
  
  async flush() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.maxBatchSize);
    const tokens = batch.map(b => b.tokenAddress);
    
    try {
      // Single request for all tokens
      const response = await fetch(
        `https://datapi.jup.ag/v1/pools?assetIds=${tokens.join(',')}`
      );
      const data = await response.json();
      
      // Resolve individual promises
      const poolMap = new Map(data.pools.map(p => [p.id, p]));
      batch.forEach(({ tokenAddress, resolve }) => {
        resolve(poolMap.get(tokenAddress));
      });
      
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

### 3. Virtual Scrolling for Token Lists
```jsx
import { FixedSizeList } from 'react-window';

function TokenList({ tokens }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TokenCard token={tokens[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={tokens.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

### 4. Lazy Loading Components
```jsx
import dynamic from 'next/dynamic';

const TradingViewChart = dynamic(
  () => import('@/components/TradingViewChart'),
  { 
    loading: () => <div>Loading chart...</div>,
    ssr: false 
  }
);
```

### 5. Debounced Search
```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  if (debouncedSearch) {
    searchTokens(debouncedSearch);
  }
}, [debouncedSearch]);
```

---

## Data Structures

### Token Data Structure
```typescript
interface TokenData {
  // Identifiers
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  
  // Bonding Curve
  bondingCurve: number;        // 0-100 percentage
  bondingStatus: string;       // 'active' | 'complete' | 'migrated'
  migrationThreshold: number;  // Usually 800M tokens
  tokensSold: number;
  
  // Market Data
  price: number;               // USD price
  marketCap: number;
  fdv: number;                // Fully diluted valuation
  liquidity: number;
  volume24h: number;
  
  // Holder Info
  holderCount: number;
  topHoldersPercentage: number;
  devWallet?: string;
  
  // Performance
  priceChange5m?: number;
  priceChange1h?: number;
  priceChange6h?: number;
  priceChange24h?: number;
  
  // Trading Stats
  buyVolume24h: number;
  sellVolume24h: number;
  numBuys24h: number;
  numSells24h: number;
  numTraders24h: number;
  
  // Metadata
  icon?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  
  // Audit
  mintAuthorityDisabled: boolean;
  freezeAuthorityDisabled: boolean;
  organicScore: number;       // 0-100 bot detection
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastTradeAt?: string;
}
```

### Chart Data Structure
```typescript
interface ChartCandle {
  time: number;      // Unix timestamp
  open: number;      // Open price
  high: number;      // High price
  low: number;       // Low price
  close: number;     // Close price
  volume: number;    // Volume in period
}

interface ChartData {
  candles: ChartCandle[];
  interval: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  token: string;
  lastUpdate: number;
}
```

---

## Frontend Integration

### React Hook for Bonding Curve
```jsx
function useBondingCurve(tokenAddress) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(
          `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const result = await response.json();
        
        if (!cancelled) {
          if (result.pools?.[0]?.dex === 'met-dbc') {
            setData({
              percentage: (result.pools[0].bondingCurve || 0) * 100,
              ...result.pools[0]
            });
          } else {
            setError('Not a DBC token');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tokenAddress]);
  
  return { data, loading, error };
}
```

### Bonding Curve Component
```jsx
function BondingCurveCard({ tokenAddress }) {
  const { data, loading, error } = useBondingCurve(tokenAddress);
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;
  
  const getColor = (percentage) => {
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-purple-500';
    if (percentage >= 25) return 'bg-blue-500';
    return 'bg-pink-500';
  };
  
  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold">{data.baseAsset?.symbol}</h3>
        <span className="text-2xl font-bold">
          {data.percentage.toFixed(1)}%
        </span>
      </div>
      
      <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(data.percentage)} transition-all duration-500`}
          style={{ width: `${Math.min(data.percentage, 100)}%` }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
        <div>
          <span className="text-gray-400">Price:</span>
          <span className="ml-2">${data.baseAsset?.usdPrice?.toFixed(8)}</span>
        </div>
        <div>
          <span className="text-gray-400">MCap:</span>
          <span className="ml-2">${(data.baseAsset?.mcap || 0).toFixed(0)}</span>
        </div>
        <div>
          <span className="text-gray-400">Holders:</span>
          <span className="ml-2">{data.baseAsset?.holderCount}</span>
        </div>
        <div>
          <span className="text-gray-400">24h:</span>
          <span className={`ml-2 ${data.baseAsset?.stats24h?.priceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.baseAsset?.stats24h?.priceChange?.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## WebSocket/SSE Implementation

### Complete WebSocket Implementation

#### Server (Node.js)
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

class TokenPriceWebSocket {
  constructor() {
    this.clients = new Map(); // clientId -> ws
    this.subscriptions = new Map(); // clientId -> Set(tokens)
    this.prices = new Map(); // token -> priceData
    
    this.startPriceUpdates();
  }
  
  async startPriceUpdates() {
    setInterval(async () => {
      const tokens = this.getAllSubscribedTokens();
      if (tokens.length === 0) return;
      
      try {
        const response = await fetch(
          `https://datapi.jup.ag/v1/pools?assetIds=${tokens.join(',')}`
        );
        const data = await response.json();
        
        // Update prices
        data.pools.forEach(pool => {
          this.prices.set(pool.id, {
            symbol: pool.baseAsset?.symbol,
            bondingCurve: (pool.bondingCurve || 0) * 100,
            price: pool.baseAsset?.usdPrice,
            change24h: pool.baseAsset?.stats24h?.priceChange
          });
        });
        
        // Broadcast to subscribers
        this.broadcast();
        
      } catch (error) {
        console.error('Price update error:', error);
      }
    }, 5000);
  }
  
  getAllSubscribedTokens() {
    const tokens = new Set();
    this.subscriptions.forEach(subs => {
      subs.forEach(token => tokens.add(token));
    });
    return Array.from(tokens);
  }
  
  broadcast() {
    this.clients.forEach((ws, clientId) => {
      const subscribedTokens = this.subscriptions.get(clientId);
      if (!subscribedTokens) return;
      
      const data = {};
      subscribedTokens.forEach(token => {
        if (this.prices.has(token)) {
          data[token] = this.prices.get(token);
        }
      });
      
      if (Object.keys(data).length > 0) {
        ws.send(JSON.stringify({
          type: 'price-update',
          data
        }));
      }
    });
  }
  
  handleConnection(ws) {
    const clientId = Math.random().toString(36).substr(2, 9);
    this.clients.set(clientId, ws);
    this.subscriptions.set(clientId, new Set());
    
    ws.on('message', (message) => {
      const msg = JSON.parse(message);
      
      switch (msg.type) {
        case 'subscribe':
          this.subscriptions.get(clientId).add(msg.token);
          // Send current price immediately
          if (this.prices.has(msg.token)) {
            ws.send(JSON.stringify({
              type: 'initial',
              data: { [msg.token]: this.prices.get(msg.token) }
            }));
          }
          break;
          
        case 'unsubscribe':
          this.subscriptions.get(clientId).delete(msg.token);
          break;
      }
    });
    
    ws.on('close', () => {
      this.clients.delete(clientId);
      this.subscriptions.delete(clientId);
    });
  }
}

const wsServer = new TokenPriceWebSocket();

wss.on('connection', (ws) => {
  wsServer.handleConnection(ws);
});
```

#### Client (React)
```jsx
class TokenWebSocket {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.ws = null;
    this.callbacks = new Map();
    this.reconnectDelay = 5000;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      // Resubscribe to all tokens
      this.callbacks.forEach((_, token) => {
        this.subscribe(token);
      });
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'price-update' || msg.type === 'initial') {
        Object.entries(msg.data).forEach(([token, data]) => {
          const callback = this.callbacks.get(token);
          if (callback) callback(data);
        });
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connect(), this.reconnectDelay);
    };
  }
  
  subscribe(token, callback) {
    this.callbacks.set(token, callback);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        token
      }));
    }
  }
  
  unsubscribe(token) {
    this.callbacks.delete(token);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        token
      }));
    }
  }
}

// React Hook
function useTokenPrice(tokenAddress) {
  const [price, setPrice] = useState(null);
  const wsRef = useRef(null);
  
  useEffect(() => {
    if (!wsRef.current) {
      wsRef.current = new TokenWebSocket();
    }
    
    wsRef.current.subscribe(tokenAddress, (data) => {
      setPrice(data);
    });
    
    return () => {
      wsRef.current.unsubscribe(tokenAddress);
    };
  }, [tokenAddress]);
  
  return price;
}

// Usage
function TokenPriceDisplay({ tokenAddress }) {
  const price = useTokenPrice(tokenAddress);
  
  if (!price) return <div>Loading...</div>;
  
  return (
    <div>
      <span>{price.symbol}: ${price.price}</span>
      <span>Bonding: {price.bondingCurve}%</span>
      <span className={price.change24h > 0 ? 'text-green' : 'text-red'}>
        {price.change24h}%
      </span>
    </div>
  );
}
```

---

## Caching Strategy

### Multi-Level Cache Implementation
```javascript
class CacheSystem {
  constructor() {
    // L1: Hot cache (instant, <100 items)
    this.l1 = new Map();
    this.l1TTL = 1000; // 1 second
    this.l1MaxSize = 100;
    
    // L2: Memory cache (fast, <1000 items)
    this.l2 = new Map();
    this.l2TTL = 10000; // 10 seconds
    this.l2MaxSize = 1000;
    
    // L3: LocalStorage (persistent)
    this.l3Prefix = 'cache_';
    this.l3TTL = 60000; // 1 minute
  }
  
  get(key) {
    // Check L1
    const l1Entry = this.l1.get(key);
    if (l1Entry && Date.now() - l1Entry.timestamp < this.l1TTL) {
      return l1Entry.data;
    }
    
    // Check L2
    const l2Entry = this.l2.get(key);
    if (l2Entry && Date.now() - l2Entry.timestamp < this.l2TTL) {
      // Promote to L1
      this.setL1(key, l2Entry.data);
      return l2Entry.data;
    }
    
    // Check L3 (LocalStorage)
    try {
      const l3Data = localStorage.getItem(this.l3Prefix + key);
      if (l3Data) {
        const l3Entry = JSON.parse(l3Data);
        if (Date.now() - l3Entry.timestamp < this.l3TTL) {
          // Promote to L2 and L1
          this.setL2(key, l3Entry.data);
          this.setL1(key, l3Entry.data);
          return l3Entry.data;
        }
      }
    } catch (e) {
      // LocalStorage might be disabled
    }
    
    return null;
  }
  
  set(key, data) {
    this.setL1(key, data);
    this.setL2(key, data);
    this.setL3(key, data);
  }
  
  setL1(key, data) {
    // Evict oldest if full
    if (this.l1.size >= this.l1MaxSize) {
      const firstKey = this.l1.keys().next().value;
      this.l1.delete(firstKey);
    }
    
    this.l1.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  setL2(key, data) {
    if (this.l2.size >= this.l2MaxSize) {
      const firstKey = this.l2.keys().next().value;
      this.l2.delete(firstKey);
    }
    
    this.l2.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  setL3(key, data) {
    try {
      localStorage.setItem(
        this.l3Prefix + key,
        JSON.stringify({
          data,
          timestamp: Date.now()
        })
      );
    } catch (e) {
      // Storage might be full
      this.clearOldL3();
    }
  }
  
  clearOldL3() {
    const now = Date.now();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.l3Prefix)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          if (now - entry.timestamp > this.l3TTL) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}
```

---

## Error Handling

### Comprehensive Error Handler
```javascript
class APIErrorHandler {
  constructor() {
    this.retryDelays = [1000, 2000, 5000, 10000]; // Exponential backoff
    this.fallbackSources = [
      'https://datapi.jup.ag',
      'https://api.dexscreener.com',
      // Add more fallbacks
    ];
  }
  
  async fetchWithRetry(url, options = {}, retryCount = 0) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (response.status === 429) {
        // Rate limited
        const retryAfter = response.headers.get('Retry-After') || 60;
        throw new RateLimitError(retryAfter);
      }
      
      if (!response.ok) {
        throw new APIError(response.status, await response.text());
      }
      
      return await response.json();
      
    } catch (error) {
      if (error instanceof RateLimitError) {
        console.warn(`Rate limited, waiting ${error.retryAfter}s`);
        await this.sleep(error.retryAfter * 1000);
        return this.fetchWithRetry(url, options, 0);
      }
      
      if (retryCount < this.retryDelays.length) {
        const delay = this.retryDelays[retryCount];
        console.warn(`Retry ${retryCount + 1} after ${delay}ms`);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      
      // All retries failed, try fallback
      return this.tryFallback(url, options);
    }
  }
  
  async tryFallback(originalUrl, options) {
    for (const fallbackBase of this.fallbackSources) {
      try {
        const fallbackUrl = originalUrl.replace(
          /https?:\/\/[^\/]+/,
          fallbackBase
        );
        const response = await fetch(fallbackUrl, options);
        if (response.ok) {
          console.log(`Fallback success: ${fallbackBase}`);
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('All sources failed');
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class RateLimitError extends Error {
  constructor(retryAfter) {
    super('Rate limited');
    this.retryAfter = retryAfter;
  }
}

class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
```

---

## Testing

### Test Token Addresses
```javascript
const TEST_TOKENS = {
  // Meteora DBC Tokens at different stages
  voice_26_percent: {
    address: '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM',
    symbol: 'V',
    name: 'Voice',
    bondingCurve: 26.85
  },
  
  routi_0_percent: {
    address: 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw',
    symbol: 'ROUTI',
    name: 'Routinegen',
    bondingCurve: 0
  },
  
  // Popular tokens (not DBC)
  bonk: {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'Bonk'
  },
  
  wif: {
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    symbol: '$WIF'
  }
};
```

### Integration Tests
```javascript
// test/bonding-curve.test.js
const { getBondingCurve } = require('../lib/meteora-dbc');

describe('Bonding Curve Tests', () => {
  test('Fetch V token bonding curve', async () => {
    const data = await getBondingCurve(TEST_TOKENS.voice_26_percent.address);
    expect(data).toBeDefined();
    expect(data.percentage).toBeGreaterThanOrEqual(0);
    expect(data.percentage).toBeLessThanOrEqual(100);
  });
  
  test('Handle non-DBC token', async () => {
    const data = await getBondingCurve(TEST_TOKENS.bonk.address);
    expect(data).toBeNull();
  });
  
  test('Cache performance', async () => {
    const start = Date.now();
    await getBondingCurve(TEST_TOKENS.voice_26_percent.address);
    const firstCall = Date.now() - start;
    
    const start2 = Date.now();
    await getBondingCurve(TEST_TOKENS.voice_26_percent.address);
    const secondCall = Date.now() - start2;
    
    expect(secondCall).toBeLessThan(firstCall / 10); // 10x faster
  });
});
```

---

## Deployment

### Environment Variables
```bash
# .env.production
NEXT_PUBLIC_RPC_ENDPOINT=https://your-quicknode-url
NEXT_PUBLIC_JUPITER_API_KEY=your-api-key
NEXT_PUBLIC_WS_URL=wss://your-websocket-server
NEXT_PUBLIC_API_URL=https://your-api-server
```

### Vercel Deployment
```json
// vercel.json
{
  "functions": {
    "app/api/prices/route.ts": {
      "maxDuration": 10
    }
  },
  "crons": [
    {
      "path": "/api/cron/update-prices",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'price-server',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }, {
    name: 'websocket-server',
    script: './server/websocket.js',
    instances: 1,
    env: {
      PORT: 8080
    }
  }]
};
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. 401 Unauthorized from Jupiter API
```javascript
// Problem: API key not working
// Solution: Use correct endpoints

// ❌ Wrong - Pro endpoint with Flex key
fetch('https://api.jup.ag/...', {
  headers: { 'x-api-key': 'flex-key' }
});

// ✅ Correct - Use Lite or Data API
fetch('https://datapi.jup.ag/v1/pools?assetIds=...');
```

#### 2. CORS Errors
```javascript
// Problem: Direct client calls blocked
// Solution: Use server proxy

// ❌ Wrong - Direct from browser
fetch('https://api.jup.ag/...');

// ✅ Correct - Through your server
fetch('/api/proxy/jupiter');
```

#### 3. Rate Limiting
```javascript
// Problem: Too many requests
// Solution: Implement caching and batching

// ❌ Wrong - Individual requests
tokens.forEach(token => fetch(`/api/price/${token}`));

// ✅ Correct - Batch request
fetch(`/api/prices?tokens=${tokens.join(',')}`);
```

#### 4. WebSocket Disconnections
```javascript
// Problem: Connection drops
// Solution: Auto-reconnect with backoff

class ReconnectingWebSocket {
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onclose = () => {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(), delay);
    };
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }
}
```

#### 5. Memory Leaks
```javascript
// Problem: Subscriptions not cleaned up
// Solution: Proper cleanup in useEffect

useEffect(() => {
  const subscription = subscribe();
  
  return () => {
    subscription.unsubscribe(); // ✅ Always cleanup
  };
}, []);
```

---

## Summary

This master documentation covers everything you need:

1. **Quick API Access**: Direct Jupiter Data API calls for bonding curve %
2. **Server Architecture**: Centralized price feed to avoid rate limits
3. **Performance**: Multi-layer caching, batching, virtual scrolling
4. **Real-time Updates**: WebSocket and SSE implementations
5. **Error Handling**: Retries, fallbacks, rate limit management
6. **Testing**: Test tokens and integration tests
7. **Deployment**: Production-ready configurations

The key insight is using a **centralized server** to fetch prices once and distribute to all clients, reducing API calls by 99% and eliminating rate limit issues.

---

## Contact & Support

For questions or issues:
- GitHub Issues: [Your Repository]
- Documentation: This file
- Test Tokens: Use provided addresses for testing