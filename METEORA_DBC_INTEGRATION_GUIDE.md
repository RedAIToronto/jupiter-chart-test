# 🚀 Meteora DBC Integration Guide for Frontend

## Overview
Complete guide for integrating Meteora Dynamic Bonding Curve data into any frontend application. This includes bonding curve percentages, token metrics, holder data, and real-time updates.

## 📊 Available Data Points

### 1. Bonding Curve Data
- **Percentage** (0-100%): Current completion of bonding curve
- **Status**: Text indicator (Just Started, Building, Pumping, etc.)
- **Migration Threshold**: Target for Raydium migration (usually 800M tokens)
- **Tokens Sold**: Current amount sold on curve
- **Is Complete**: Boolean for migration status

### 2. Token Information
- **Symbol & Name**: Token identifiers
- **Address**: Token mint address
- **Decimals**: Token decimal places
- **Icon/Logo**: Token image URL
- **Website**: Project website
- **Dev Wallet**: Developer wallet address

### 3. Market Metrics
- **Price USD**: Current token price
- **Market Cap**: Total market capitalization
- **FDV**: Fully diluted valuation
- **Liquidity**: Current liquidity in USD
- **Volume 24h**: Trading volume last 24 hours
- **Circulating Supply**: Tokens in circulation
- **Total Supply**: Maximum token supply

### 4. Holder Analytics
- **Holder Count**: Number of unique holders
- **Top Holders %**: Concentration percentage
- **Holder Change 24h**: Growth in holders

### 5. Trading Statistics
- **Price Change** (5m, 1h, 6h, 24h)
- **Buy/Sell Volume**
- **Number of Buys/Sells**
- **Number of Traders**
- **Net Buyers/Sellers**

### 6. Audit Information
- **Mint Authority Disabled**: Security check
- **Freeze Authority Disabled**: Security check
- **Organic Score**: Bot/organic trading score
- **Tags**: Token categorization

## 🔌 API Endpoints

### Primary Data Source: Jupiter Data API
```javascript
// Base URL
const BASE_URL = 'https://datapi.jup.ag';

// Get token/pool data
GET /v1/pools?assetIds={tokenAddress}

// Example
fetch('https://datapi.jup.ag/v1/pools?assetIds=7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM')
```

### Response Structure
```json
{
  "pools": [{
    "id": "tokenAddress",
    "dex": "met-dbc",
    "bondingCurve": 0.2685,  // Multiply by 100 for percentage
    "liquidity": 713.67,
    "volume24h": 708.66,
    "baseAsset": {
      "symbol": "V",
      "name": "Voice",
      "usdPrice": 0.00000613,
      "mcap": 6131.34,
      "holderCount": 3,
      "stats24h": {
        "priceChange": 19.06,
        "holderChange": 200,
        "buyVolume": 708.66,
        "numBuys": 2,
        "numTraders": 2
      }
    }
  }]
}
```

## 💻 Implementation Examples

### 1. Basic Fetch Function
```javascript
async function getMeteoraDBCData(tokenAddress) {
  try {
    const response = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    
    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    
    if (data.pools && data.pools.length > 0) {
      const pool = data.pools[0];
      
      // Check if it's a Meteora DBC token
      if (pool.dex !== 'met-dbc') {
        return null; // Not a DBC token
      }
      
      return {
        // Bonding Curve
        bondingPercentage: (pool.bondingCurve || 0) * 100,
        
        // Token Info
        symbol: pool.baseAsset?.symbol,
        name: pool.baseAsset?.name,
        icon: pool.baseAsset?.icon,
        
        // Market Data
        price: pool.baseAsset?.usdPrice || 0,
        marketCap: pool.baseAsset?.mcap || 0,
        liquidity: pool.liquidity || 0,
        volume24h: pool.volume24h || 0,
        
        // Holders
        holders: pool.baseAsset?.holderCount || 0,
        
        // Performance
        priceChange24h: pool.baseAsset?.stats24h?.priceChange || 0,
        
        // Raw data for advanced use
        raw: pool
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching DBC data:', error);
    return null;
  }
}
```

### 2. React Component Example
```jsx
import { useState, useEffect } from 'react';

function BondingCurveDisplay({ tokenAddress }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getMeteoraDBCData(tokenAddress);
      setData(result);
      setLoading(false);
    }
    
    fetchData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, [tokenAddress]);
  
  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Not a DBC token</div>;
  
  const getStatusText = (percentage) => {
    if (percentage === 0) return '🎯 Just Started';
    if (percentage < 25) return '🌱 Early Stage';
    if (percentage < 50) return '📈 Building Momentum';
    if (percentage < 75) return '🚀 Growing Strong';
    if (percentage < 90) return '🔥 Pumping!';
    if (percentage < 100) return '⚡ Almost There!';
    return '✅ Migration Complete!';
  };
  
  const getProgressColor = (percentage) => {
    if (percentage >= 75) return '#FFA500'; // Orange
    if (percentage >= 50) return '#9333EA'; // Purple
    return '#EC4899'; // Pink
  };
  
  return (
    <div className="bonding-curve-card">
      <h3>{data.symbol} - {data.name}</h3>
      
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar" 
             style={{ 
               width: `${data.bondingPercentage}%`,
               backgroundColor: getProgressColor(data.bondingPercentage)
             }}
        />
      </div>
      
      <div className="metrics">
        <div>Bonding: {data.bondingPercentage.toFixed(2)}%</div>
        <div>Status: {getStatusText(data.bondingPercentage)}</div>
        <div>Price: ${data.price.toFixed(8)}</div>
        <div>MCap: ${data.marketCap.toFixed(0)}</div>
        <div>Holders: {data.holders}</div>
        <div>24h: {data.priceChange24h > 0 ? '+' : ''}{data.priceChange24h.toFixed(2)}%</div>
      </div>
    </div>
  );
}
```

### 3. Vue.js Component Example
```vue
<template>
  <div class="bonding-curve">
    <h3>{{ symbol }} - Bonding: {{ bondingPercentage }}%</h3>
    
    <div class="progress-bar">
      <div class="progress-fill" 
           :style="{ width: bondingPercentage + '%' }">
      </div>
    </div>
    
    <div class="stats">
      <span>{{ statusText }}</span>
      <span>${{ price }}</span>
      <span>{{ holders }} holders</span>
    </div>
  </div>
</template>

<script>
export default {
  props: ['tokenAddress'],
  data() {
    return {
      bondingPercentage: 0,
      symbol: '',
      price: 0,
      holders: 0
    }
  },
  computed: {
    statusText() {
      const p = this.bondingPercentage;
      if (p === 0) return '🎯 Just Started';
      if (p < 25) return '🌱 Early Stage';
      if (p < 50) return '📈 Building';
      if (p < 75) return '🚀 Growing';
      return '🔥 Pumping!';
    }
  },
  async mounted() {
    const data = await this.fetchDBCData();
    if (data) {
      this.bondingPercentage = data.bondingPercentage;
      this.symbol = data.symbol;
      this.price = data.price;
      this.holders = data.holders;
    }
  },
  methods: {
    async fetchDBCData() {
      // Implementation here
    }
  }
}
</script>
```

### 4. Real-time Updates with WebSocket (Future)
```javascript
// When Meteora provides WebSocket endpoint
class DBCWebSocket {
  constructor(tokenAddress) {
    this.ws = new WebSocket('wss://api.meteora-dbc.com/ws');
    
    this.ws.onopen = () => {
      // Subscribe to token updates
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        token: tokenAddress
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Handle real-time updates
      this.onUpdate(data);
    };
  }
  
  onUpdate(data) {
    // Update UI with new bonding curve percentage
    console.log('New bonding %:', data.bondingPercentage);
  }
}
```

## 📈 Visual Progress Bar CSS

```css
/* Modern Bonding Curve Progress Bar */
.progress-container {
  width: 100%;
  height: 32px;
  background: #1f2937;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #ec4899);
  transition: width 0.5s ease;
  position: relative;
  overflow: hidden;
}

/* Animated shine effect */
.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Milestone markers */
.milestones {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  padding: 0 8px;
  align-items: center;
}

.milestone {
  width: 2px;
  height: 50%;
  background: rgba(255, 255, 255, 0.2);
}
```

## 🔄 Caching Strategy

```javascript
class DBCCache {
  constructor(ttl = 10000) { // 10 second TTL
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  get(tokenAddress) {
    const entry = this.cache.get(tokenAddress);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(tokenAddress);
      return null;
    }
    
    return entry.data;
  }
  
  set(tokenAddress, data) {
    this.cache.set(tokenAddress, {
      data,
      timestamp: Date.now()
    });
  }
}

const dbcCache = new DBCCache();

async function getCachedDBCData(tokenAddress) {
  // Check cache first
  let data = dbcCache.get(tokenAddress);
  if (data) return data;
  
  // Fetch fresh data
  data = await getMeteoraDBCData(tokenAddress);
  if (data) {
    dbcCache.set(tokenAddress, data);
  }
  
  return data;
}
```

## 🎯 Status Indicators

### Bonding Curve Stages
| Percentage | Status | Description | Visual |
|------------|--------|-------------|--------|
| 0% | Just Started | Token just launched | 🎯 |
| 1-25% | Early Stage | Initial accumulation | 🌱 |
| 25-50% | Building Momentum | Growing interest | 📈 |
| 50-75% | Growing Strong | Active trading | 🚀 |
| 75-90% | Pumping | High activity | 🔥 |
| 90-99% | Almost There | Near migration | ⚡ |
| 100% | Complete | Migrated to Raydium | ✅ |

## 🛠️ Utility Functions

```javascript
// Format large numbers
function formatNumber(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

// Format USD price
function formatPrice(price) {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(6);
  return price.toFixed(2);
}

// Calculate time until migration (estimate)
function estimateTimeToMigration(percentage, recentGrowthRate) {
  if (percentage >= 100) return 'Complete';
  if (recentGrowthRate <= 0) return 'Unknown';
  
  const remaining = 100 - percentage;
  const hoursToComplete = remaining / recentGrowthRate;
  
  if (hoursToComplete < 1) return '< 1 hour';
  if (hoursToComplete < 24) return `~${Math.round(hoursToComplete)} hours`;
  return `~${Math.round(hoursToComplete / 24)} days`;
}

// Get risk level
function getRiskLevel(holders, liquidity, percentage) {
  if (holders < 10 && liquidity < 1000) return 'Very High Risk';
  if (holders < 50 && liquidity < 10000) return 'High Risk';
  if (holders < 100 && percentage < 50) return 'Medium Risk';
  if (percentage > 75) return 'Lower Risk';
  return 'Moderate Risk';
}
```

## 📱 Mobile Responsive Example

```jsx
function MobileBondingCard({ tokenAddress }) {
  const [data, setData] = useState(null);
  
  // ... fetch logic ...
  
  return (
    <div className="mobile-card">
      <div className="header">
        <img src={data.icon} alt={data.symbol} />
        <div>
          <h4>{data.symbol}</h4>
          <span>${formatPrice(data.price)}</span>
        </div>
      </div>
      
      <div className="bonding-mini">
        <div className="percentage">{data.bondingPercentage.toFixed(1)}%</div>
        <div className="mini-bar">
          <div style={{ width: `${data.bondingPercentage}%` }} />
        </div>
      </div>
      
      <div className="quick-stats">
        <span>{data.holders} holders</span>
        <span>${formatNumber(data.marketCap)}</span>
        <span className={data.priceChange24h > 0 ? 'green' : 'red'}>
          {data.priceChange24h.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
```

## 🔍 Error Handling

```javascript
async function safeGetDBCData(tokenAddress) {
  try {
    const data = await getMeteoraDBCData(tokenAddress);
    
    if (!data) {
      return {
        error: 'NOT_DBC_TOKEN',
        message: 'This token is not on Meteora DBC'
      };
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('DBC fetch error:', error);
    
    // Fallback to alternative sources
    try {
      const fallback = await fetchFromDexScreener(tokenAddress);
      if (fallback) {
        return { success: true, data: fallback, source: 'dexscreener' };
      }
    } catch (e) {
      // Fallback failed too
    }
    
    return {
      error: 'FETCH_ERROR',
      message: 'Unable to fetch bonding curve data'
    };
  }
}
```

## 📊 Alternative Data Sources

### DexScreener API (Backup)
```javascript
async function fetchFromDexScreener(tokenAddress) {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
  );
  
  const data = await response.json();
  
  if (data.pairs) {
    const meteoraPair = data.pairs.find(p => 
      p.dexId && p.dexId.includes('meteora')
    );
    
    if (meteoraPair) {
      // Estimate bonding curve from liquidity
      const estimatedPercentage = Math.min(
        (meteoraPair.liquidity?.usd || 0) / 50000 * 100,
        100
      );
      
      return {
        bondingPercentage: estimatedPercentage,
        symbol: meteoraPair.baseToken.symbol,
        name: meteoraPair.baseToken.name,
        price: parseFloat(meteoraPair.priceUsd),
        marketCap: meteoraPair.marketCap,
        liquidity: meteoraPair.liquidity?.usd,
        volume24h: meteoraPair.volume?.h24,
        priceChange24h: meteoraPair.priceChange?.h24
      };
    }
  }
  
  return null;
}
```

## 🚀 Performance Optimization Tips

1. **Cache aggressively** - DBC data doesn't change rapidly
2. **Batch requests** - Fetch multiple tokens in one call when possible
3. **Use pagination** - For large token lists
4. **Implement virtual scrolling** - For long lists of tokens
5. **Lazy load** - Only fetch data for visible tokens
6. **Use Web Workers** - For heavy calculations

## 📝 Testing Token Addresses

```javascript
const TEST_TOKENS = {
  // Different bonding curve stages
  voice_26_percent: '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM',
  routi_0_percent: 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw',
  
  // Add more test tokens as needed
};
```

## 🔗 Related Resources

- [Jupiter API Docs](https://docs.jup.ag)
- [Meteora Protocol](https://meteora.ag)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js)
- [DexScreener API](https://docs.dexscreener.com)

## 📞 Support

For integration support or questions about this guide, refer to the main project documentation or open an issue in the repository.