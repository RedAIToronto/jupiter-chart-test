// Test script to fetch bonding curve percentage for a specific token
const tokenAddress = 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw';

async function fetchBondingCurve() {
  console.log(`\n🔍 Fetching bonding curve for token: ${tokenAddress}\n`);
  
  try {
    // Method 1: Jupiter API v1/pools
    console.log('1️⃣ Trying Jupiter API v1/pools...');
    const jupiterResponse = await fetch(
      `https://api.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    
    if (jupiterResponse.ok) {
      const data = await jupiterResponse.json();
      console.log('Jupiter API Response:', JSON.stringify(data, null, 2));
      
      if (data.pools && data.pools.length > 0) {
        const pool = data.pools[0];
        
        // Check if it's a Meteora DBC token
        if (pool.dex === 'met-dbc') {
          console.log('\n✅ Found Meteora DBC Token!');
          console.log('DEX:', pool.dex);
          
          // Check for bonding curve data
          if (typeof pool.bondingCurve === 'number') {
            const percentage = pool.bondingCurve * 100;
            console.log(`\n📊 BONDING CURVE: ${percentage.toFixed(2)}%`);
          }
          
          // Check for additional pool info
          if (pool.poolInfo) {
            console.log('\nPool Info:', pool.poolInfo);
            if (pool.poolInfo.tokensSold && pool.poolInfo.migrationThreshold) {
              const percentage = (pool.poolInfo.tokensSold / pool.poolInfo.migrationThreshold) * 100;
              console.log(`Calculated from tokens: ${percentage.toFixed(2)}%`);
            }
          }
          
          // Display token info
          if (pool.baseAsset) {
            console.log('\n📈 Token Details:');
            console.log('Symbol:', pool.baseAsset.symbol);
            console.log('Name:', pool.baseAsset.name);
            console.log('Price:', pool.baseAsset.usdPrice || 'Not available');
            console.log('Total Supply:', pool.baseAsset.totalSupply);
          }
          
          // Display liquidity and volume
          console.log('\n💰 Metrics:');
          console.log('Liquidity:', pool.liquidity || 'N/A');
          console.log('Volume 24h:', pool.volume24h || 'N/A');
          
        } else {
          console.log(`\n⚠️ Not a Meteora DBC token. DEX: ${pool.dex}`);
        }
      } else {
        console.log('No pools found for this token');
      }
    } else {
      console.log('Jupiter API error:', jupiterResponse.status);
    }
    
    // Method 2: Try DexScreener as fallback
    console.log('\n2️⃣ Trying DexScreener API...');
    const dexScreenerResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    
    if (dexScreenerResponse.ok) {
      const data = await dexScreenerResponse.json();
      console.log('\nDexScreener Response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      
      if (data.pairs && data.pairs.length > 0) {
        const meteoraPair = data.pairs.find(p => p.dexId && p.dexId.includes('meteora'));
        
        if (meteoraPair) {
          console.log('\n✅ Found on Meteora via DexScreener!');
          console.log('Pair Address:', meteoraPair.pairAddress);
          console.log('Price USD:', meteoraPair.priceUsd);
          console.log('Liquidity:', meteoraPair.liquidity);
          console.log('Volume 24h:', meteoraPair.volume?.h24);
          console.log('Price Change 24h:', meteoraPair.priceChange?.h24);
          
          // Estimate bonding curve from liquidity (rough approximation)
          if (meteoraPair.liquidity?.usd) {
            const estimatedPercentage = Math.min((meteoraPair.liquidity.usd / 50000) * 100, 100);
            console.log(`\n📊 ESTIMATED BONDING CURVE: ${estimatedPercentage.toFixed(2)}%`);
            console.log('(Based on liquidity - this is an approximation)');
          }
        } else {
          console.log('Not found on Meteora DEX');
        }
      }
    } else {
      console.log('DexScreener API error:', dexScreenerResponse.status);
    }
    
    // Method 3: Try direct Meteora API if available
    console.log('\n3️⃣ Checking token info via Jupiter token list...');
    const tokenInfoResponse = await fetch(
      `https://token.jup.ag/strict?tokens=${tokenAddress}`
    );
    
    if (tokenInfoResponse.ok) {
      const tokens = await tokenInfoResponse.json();
      if (tokens.length > 0) {
        const token = tokens[0];
        console.log('\nToken Metadata:');
        console.log('Symbol:', token.symbol);
        console.log('Name:', token.name);
        console.log('Decimals:', token.decimals);
        console.log('Tags:', token.tags);
      }
    }
    
  } catch (error) {
    console.error('Error fetching bonding curve:', error);
  }
}

// Run the test
fetchBondingCurve();