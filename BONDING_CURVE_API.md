# 📊 Meteora DBC Bonding Curve API Documentation

## Overview
This documentation explains how to fetch and display bonding curve completion percentages for Meteora Dynamic Bonding Curve (DBC) tokens in your Jupiter Chart application.

## 🚀 Quick Start

### 1. Display Bonding Curve Progress Component

```tsx
import BondingCurveProgress from '@/components/BondingCurveProgress';

// Full display with details
<BondingCurveProgress 
  tokenAddress="b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp"
  showDetails={true}
  autoRefresh={true}
  refreshInterval={5000}
/>

// Compact inline display
import { BondingCurveProgressCompact } from '@/components/BondingCurveProgress';

<BondingCurveProgressCompact tokenAddress="token_address_here" />
```

### 2. Fetch Bonding Curve Data Programmatically

```typescript
import { getMeteoraDBCClient } from '@/lib/meteora-dbc-client';

// Get bonding curve percentage only
const dbcClient = getMeteoraDBCClient();
const percentage = await dbcClient.getBondingCurvePercentage('token_address');
console.log(`Bonding curve: ${percentage}%`);

// Get complete DBC token information
const tokenInfo = await dbcClient.getDBCTokenInfo('token_address');
console.log(tokenInfo);
// Returns:
// {
//   tokenAddress: string,
//   bondingCurvePercentage: number (0-100),
//   tokensSold: number,
//   totalSupply: number,
//   currentPrice: number,
//   marketCap: number,
//   isComplete: boolean,
//   migrationThreshold: number,
//   dex: string
// }
```

## 📈 Component Props

### BondingCurveProgress Component

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tokenAddress` | `string` | required | The token mint address |
| `showDetails` | `boolean` | `true` | Show detailed metrics (tokens sold, price, etc.) |
| `autoRefresh` | `boolean` | `true` | Enable automatic data refresh |
| `refreshInterval` | `number` | `5000` | Refresh interval in milliseconds |

## 🔧 API Methods

### MeteoraDBCClient

#### `getBondingCurvePercentage(tokenAddress: string): Promise<number>`
Returns the bonding curve completion percentage (0-100).

```typescript
const percentage = await dbcClient.getBondingCurvePercentage('token_address');
// Returns: 45.67
```

#### `getDBCTokenInfo(tokenAddress: string): Promise<DBCTokenInfo | null>`
Returns complete token information including bonding curve status.

```typescript
const info = await dbcClient.getDBCTokenInfo('token_address');
// Returns full DBCTokenInfo object or null if not a DBC token
```

#### `monitorBondingCurve(tokenAddress, callback, interval): Promise<() => void>`
Monitor bonding curve progress with live updates.

```typescript
const stopMonitoring = await dbcClient.monitorBondingCurve(
  'token_address',
  (info) => {
    console.log(`Updated: ${info.bondingCurvePercentage}%`);
  },
  5000 // Update every 5 seconds
);

// Stop monitoring when done
stopMonitoring();
```

#### `getBatchDBCInfo(tokenAddresses: string[]): Promise<Map<string, DBCTokenInfo>>`
Fetch multiple DBC tokens information in batch.

```typescript
const tokens = ['token1', 'token2', 'token3'];
const results = await dbcClient.getBatchDBCInfo(tokens);

results.forEach((info, address) => {
  console.log(`${address}: ${info.bondingCurvePercentage}%`);
});
```

## 🎨 Visual Indicators

The component provides visual feedback based on completion:

| Percentage | Status | Color | Message |
|------------|--------|-------|---------|
| 0-25% | 🎯 Just started | Purple → Pink | Initial phase |
| 25-50% | 🌱 Building momentum | Blue → Purple | Growing interest |
| 50-75% | 📈 Growing strong | Blue → Purple | Gaining traction |
| 75-90% | 🚀 Pumping! | Yellow → Orange | High activity |
| 90-99% | 🔥 Almost there! | Yellow → Orange | Near migration |
| 100% | ✅ Migration Complete! | Green | Migrated to Raydium |

## 💡 Usage Examples

### Example 1: Display in Token Card

```tsx
function TokenCard({ tokenAddress, tokenSymbol }) {
  return (
    <div className="token-card">
      <h3>{tokenSymbol}</h3>
      <BondingCurveProgress 
        tokenAddress={tokenAddress}
        showDetails={false}
        refreshInterval={10000}
      />
    </div>
  );
}
```

### Example 2: Conditional Display for DBC Tokens

```tsx
function TokenDisplay({ tokenInfo }) {
  return (
    <div>
      {tokenInfo.dex === 'met-dbc' && (
        <BondingCurveProgress 
          tokenAddress={tokenInfo.address}
          showDetails={true}
        />
      )}
    </div>
  );
}
```

### Example 3: Custom Progress Bar

```tsx
function CustomProgress() {
  const [percentage, setPercentage] = useState(0);
  
  useEffect(() => {
    const dbcClient = getMeteoraDBCClient();
    dbcClient.getBondingCurvePercentage('token_address')
      .then(setPercentage);
  }, []);
  
  return (
    <div className="w-full bg-gray-800 rounded-full h-4">
      <div 
        className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full"
        style={{ width: `${percentage}%` }}
      />
      <span>{percentage.toFixed(1)}%</span>
    </div>
  );
}
```

### Example 4: Alert on Migration

```tsx
function MigrationAlert({ tokenAddress }) {
  const [alert, setAlert] = useState(false);
  
  useEffect(() => {
    const dbcClient = getMeteoraDBCClient();
    const cleanup = dbcClient.monitorBondingCurve(
      tokenAddress,
      (info) => {
        if (info.bondingCurvePercentage >= 95 && !info.isComplete) {
          setAlert(true);
        }
        if (info.isComplete) {
          alert('Token has migrated to Raydium!');
        }
      },
      5000
    );
    
    return () => cleanup.then(fn => fn());
  }, [tokenAddress]);
  
  return alert && (
    <div className="alert">
      ⚡ Migration imminent! Bonding curve almost complete!
    </div>
  );
}
```

## 🔍 Data Sources

The bonding curve data is fetched from multiple sources:

1. **Primary**: Jupiter API v1/pools endpoint
2. **Fallback**: DexScreener API (when Jupiter data unavailable)
3. **Cache**: 10-second TTL for performance

## ⚡ Performance Optimization

- **Automatic Caching**: Data cached for 10 seconds to reduce API calls
- **Batch Processing**: Fetch multiple tokens efficiently
- **Smart Refresh**: Only updates when component is visible
- **Memory Management**: Automatic cache cleanup

## 🛠️ Troubleshooting

### No Data Displayed
- Verify the token is a Meteora DBC token (dex === 'met-dbc')
- Check token address is valid
- Ensure API endpoints are accessible

### Percentage Not Updating
- Check `autoRefresh` is enabled
- Verify `refreshInterval` is reasonable (5000ms recommended)
- Check network connectivity

### Wrong Percentage
- Data may be cached - wait 10 seconds for refresh
- Token might have already migrated (check `isComplete`)

## 📝 Notes

- Bonding curve reaches 100% when migration threshold is met (typically 800M tokens sold)
- After 100%, token migrates to Raydium automatically
- Price increases along the bonding curve as more tokens are sold
- Real-time updates depend on blockchain data availability

## 🔗 Related Files

- `/lib/meteora-dbc-client.ts` - Core API client
- `/components/BondingCurveProgress.tsx` - UI components
- `/lib/jupiter-client.ts` - Jupiter API integration
- `/components/TradingInterface.tsx` - Integration example