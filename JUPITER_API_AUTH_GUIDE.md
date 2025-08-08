# Jupiter API v6 Authentication Guide

## Executive Summary

Based on testing and official documentation, here are the key findings about Jupiter API authentication:

### Critical Issues with Your Current Setup

1. **Your API key appears to be a "Flex" plan key** which has limited access to Pro endpoints
2. **401 errors on `api.jup.ag` endpoints** are due to Flex plan restrictions, not authentication issues
3. **Price API v2 is deprecated** and will be removed by August 2025 - migrate to v3 immediately
4. **Use `lite-api.jup.ag` endpoints** for all functionality without authentication requirements

## Authentication Requirements by Endpoint

### 1. Price API

#### Price v2 (DEPRECATED - Remove by August 2025)
- **Lite Endpoint**: `https://lite-api.jup.ag/price/v2` - ✅ No auth required
- **Pro Endpoint**: `https://api.jup.ag/price/v2` - ❌ Requires Pro/Ultra plan (not Flex)

#### Price v3 (Current)
- **Lite Endpoint**: `https://lite-api.jup.ag/price/v3` - ✅ No auth required
- **Pro Endpoint**: `https://api.jup.ag/price/v3` - ❌ Requires Pro/Ultra plan (not Flex)

### 2. Quote/Swap API

#### Legacy Quote v6
- **Endpoint**: `https://quote-api.jup.ag/v6/quote` - ✅ No auth required (but being phased out)

#### New Swap v1 Quote (Recommended)
- **Lite Endpoint**: `https://lite-api.jup.ag/swap/v1/quote` - ✅ No auth required
- **Pro Endpoint**: `https://api.jup.ag/swap/v1/quote` - ❌ Requires Pro/Ultra plan (not Flex)

### 3. Data API
- **Endpoint**: `https://datapi.jup.ag/*` - ✅ No auth required (separate service)

## Correct Header Format

When using Pro endpoints with a valid Pro/Ultra API key:

```javascript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': 'your-api-key-here'  // Only for api.jup.ag endpoints
};
```

**Note**: Authorization Bearer format is NOT supported.

## API Plan Tiers

### Lite (Free)
- Base URL: `https://lite-api.jup.ag`
- Authentication: None required
- Rate Limit: 60-second window
- Access: All documented endpoints

### Flex (Your Current Plan)
- Limited access to Pro endpoints
- Error message: "Flex plans are not authorized to access this endpoint"
- Solution: Use Lite endpoints or upgrade to Pro

### Pro
- Base URL: `https://api.jup.ag`
- Authentication: Required (`x-api-key` header)
- Rate Limit: 10-second window, higher limits
- Access: All endpoints with higher rate limits

### Ultra
- Base URL: `https://api.jup.ag/ultra`
- Authentication: Required (`x-api-key` header)
- Rate Limit: Dynamic based on swap volume
- Access: Premium features and highest rate limits

## Recommended Implementation Strategy

### For Development/Testing
```javascript
// Use Lite endpoints - no authentication needed
const ENDPOINTS = {
  price: 'https://lite-api.jup.ag/price/v3',
  quote: 'https://lite-api.jup.ag/swap/v1/quote',
  swap: 'https://lite-api.jup.ag/swap/v1/swap',
  data: 'https://datapi.jup.ag'
};

// No headers needed
const response = await fetch(`${ENDPOINTS.price}?ids=${tokenAddress}`);
```

### For Production with Pro Plan
```javascript
const API_KEY = process.env.JUPITER_API_KEY;

const ENDPOINTS = {
  price: 'https://api.jup.ag/price/v3',
  quote: 'https://api.jup.ag/swap/v1/quote',
  swap: 'https://api.jup.ag/swap/v1/swap'
};

const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY  // Required for Pro endpoints
};

const response = await fetch(`${ENDPOINTS.price}?ids=${tokenAddress}`, { headers });
```

### Hybrid Approach (Recommended)
```javascript
class JupiterAPI {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.isProPlan = apiKey && !this.isFlexKey(apiKey);
    
    // Use Pro endpoints if valid Pro key, otherwise use Lite
    this.baseUrl = this.isProPlan 
      ? 'https://api.jup.ag' 
      : 'https://lite-api.jup.ag';
  }
  
  isFlexKey(apiKey) {
    // Flex keys get specific error messages
    // You can detect this on first failed request
    return false; // Implement detection logic
  }
  
  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.isProPlan && this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }
  
  async getPrice(tokenIds) {
    const response = await fetch(
      `${this.baseUrl}/price/v3?ids=${tokenIds}`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }
  
  async getQuote(params) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${this.baseUrl}/swap/v1/quote?${queryString}`,
      { headers: this.getHeaders() }
    );
    return response.json();
  }
}
```

## Migration Checklist

### Immediate Actions Required

1. **Stop using Price API v2** - It's deprecated and will be removed by August 2025
   - Change: `https://api.jup.ag/price/v2` → `https://lite-api.jup.ag/price/v3`

2. **Switch to Lite endpoints** for your Flex plan
   - Change: `https://api.jup.ag/*` → `https://lite-api.jup.ag/*`

3. **Update Quote endpoint**
   - Change: `https://quote-api.jup.ag/v6/quote` → `https://lite-api.jup.ag/swap/v1/quote`

4. **Remove unnecessary authentication** from Lite endpoint calls
   - Lite endpoints don't require the `x-api-key` header

### Code Changes Needed

In `/app/api/jupiter/route.ts`:
```javascript
// Update base URL logic
const isLiteEndpoint = !JUPITER_API_KEY || isFlexPlan(JUPITER_API_KEY);
const baseUrl = isLiteEndpoint 
  ? 'https://lite-api.jup.ag'
  : 'https://api.jup.ag';

// Only add API key for Pro endpoints
const headers = {
  'Content-Type': 'application/json',
  ...((!isLiteEndpoint && JUPITER_API_KEY) && { 'x-api-key': JUPITER_API_KEY })
};
```

## Rate Limiting Considerations

### Lite Plan Limits
- Window: 60 seconds
- Suitable for: Development, low-volume applications
- No authentication required

### Pro Plan Limits
- Window: 10 seconds  
- Higher request quotas
- Requires valid Pro API key (not Flex)
- Better for production applications

### Best Practices
1. Implement exponential backoff for rate limit errors
2. Cache responses when possible
3. Batch requests where applicable
4. Monitor rate limit headers in responses

## Error Handling

### Common Error Responses

```javascript
// 401 - No authentication provided (Pro endpoints)
{ "code": 401, "message": "Unauthorized" }

// 401 - Flex plan trying to access Pro endpoint
{ "message": "Flex plans are not authorized to access this endpoint, please upgrade your plan." }

// 429 - Rate limit exceeded
{ "code": 429, "message": "Rate limit exceeded" }

// 404 - Endpoint not found (check URL)
{ "code": 404, "message": "Not found" }
```

### Recommended Error Handler
```javascript
async function jupiterAPICall(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      switch (response.status) {
        case 401:
          if (error.message?.includes('Flex plans')) {
            // Fallback to Lite endpoint
            const liteUrl = url.replace('api.jup.ag', 'lite-api.jup.ag');
            return fetch(liteUrl, { ...options, headers: { 'Content-Type': 'application/json' } });
          }
          throw new Error('Authentication required');
          
        case 429:
          // Implement retry with backoff
          throw new Error('Rate limit exceeded');
          
        default:
          throw new Error(error.message || `HTTP ${response.status}`);
      }
    }
    
    return response.json();
  } catch (error) {
    console.error('Jupiter API Error:', error);
    throw error;
  }
}
```

## Conclusion

Your 401 errors are occurring because:
1. Your API key is a Flex plan key with limited access
2. Flex plans cannot access `api.jup.ag` Pro endpoints
3. Price API v2 is deprecated

**Solution**: Use `lite-api.jup.ag` endpoints for all API calls, which don't require authentication and provide the same data freshness. If you need higher rate limits, upgrade from Flex to Pro plan at https://portal.jup.ag.