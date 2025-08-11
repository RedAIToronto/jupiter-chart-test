// Test script to fetch bonding curve for 7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM
const tokenAddress = '7pptQpJhe4Zm7YYqxF9Qw2bQboMTpXLskpiBsLyEHAYM';

async function fetchBondingCurveData() {
  console.log(`\n🔍 Fetching bonding curve for token: ${tokenAddress}\n`);
  
  try {
    // Method 1: Jupiter Data API (most reliable for Meteora DBC)
    console.log('1️⃣ Fetching from Jupiter Data API...');
    const dataResponse = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      console.log('Full Response:', JSON.stringify(data, null, 2));
      
      if (data.pools && data.pools.length > 0) {
        const pool = data.pools[0];
        
        console.log('\n✅ TOKEN FOUND!');
        console.log('================================');
        console.log('DEX:', pool.dex);
        console.log('Type:', pool.type);
        
        if (pool.dex === 'met-dbc') {
          console.log('\n🎯 METEORA DBC TOKEN CONFIRMED!');
          
          // Bonding Curve Data
          console.log('\n📊 BONDING CURVE DATA:');
          if (typeof pool.bondingCurve === 'number') {
            const percentage = pool.bondingCurve * 100;
            console.log(`BONDING CURVE PERCENTAGE: ${percentage.toFixed(2)}%`);
            
            // Status based on percentage
            let status = '';
            if (percentage === 0) status = '🎯 Just started';
            else if (percentage < 25) status = '🌱 Early stage';
            else if (percentage < 50) status = '📈 Building momentum';
            else if (percentage < 75) status = '🚀 Growing strong';
            else if (percentage < 90) status = '🔥 Pumping!';
            else if (percentage < 100) status = '⚡ Almost there!';
            else status = '✅ Migration complete!';
            
            console.log(`STATUS: ${status}`);
          }
          
          // Token Details
          if (pool.baseAsset) {
            console.log('\n📈 TOKEN DETAILS:');
            console.log('Symbol:', pool.baseAsset.symbol);
            console.log('Name:', pool.baseAsset.name);
            console.log('Price USD:', pool.baseAsset.usdPrice || 'Not available');
            console.log('Market Cap:', pool.baseAsset.mcap || pool.baseAsset.fdv || 'N/A');
            console.log('Total Supply:', pool.baseAsset.totalSupply);
            console.log('Circulating Supply:', pool.baseAsset.circSupply);
            console.log('Holder Count:', pool.baseAsset.holderCount);
            
            // Dev wallet
            if (pool.baseAsset.dev) {
              console.log('Dev Wallet:', pool.baseAsset.dev);
            }
            
            // Launch info
            if (pool.baseAsset.launchpad) {
              console.log('Launchpad:', pool.baseAsset.launchpad);
            }
            
            // Audit info
            if (pool.baseAsset.audit) {
              console.log('\n🔍 AUDIT INFO:');
              console.log('Mint Authority Disabled:', pool.baseAsset.audit.mintAuthorityDisabled);
              console.log('Freeze Authority Disabled:', pool.baseAsset.audit.freezeAuthorityDisabled);
              console.log('Top Holders %:', pool.baseAsset.audit.topHoldersPercentage);
            }
          }
          
          // Market Metrics
          console.log('\n💰 MARKET METRICS:');
          console.log('Liquidity:', pool.liquidity || 'N/A');
          console.log('Volume 24h:', pool.volume24h || 'N/A');
          console.log('Created At:', pool.createdAt);
          console.log('Updated At:', pool.updatedAt);
          
          // Stats
          if (pool.baseAsset?.stats24h) {
            console.log('\n📊 24H STATS:');
            const stats = pool.baseAsset.stats24h;
            console.log('Holder Change:', stats.holderChange);
            console.log('Liquidity Change:', stats.liquidityChange);
            console.log('Buy Volume:', stats.buyVolume);
            console.log('Sell Volume:', stats.sellVolume);
            console.log('Number of Buys:', stats.numBuys);
            console.log('Number of Sells:', stats.numSells);
            console.log('Number of Traders:', stats.numTraders);
          }
          
        } else {
          console.log(`\n⚠️ Not a Meteora DBC token. DEX: ${pool.dex}`);
        }
      } else {
        console.log('❌ No pools found for this token');
      }
    } else {
      console.log('API Error:', dataResponse.status);
    }
    
    // Method 2: DexScreener as backup
    console.log('\n\n2️⃣ Checking DexScreener for additional data...');
    const dexResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    
    if (dexResponse.ok) {
      const data = await dexResponse.json();
      if (data.pairs && data.pairs.length > 0) {
        const meteoraPair = data.pairs.find(p => p.dexId && p.dexId.includes('meteora'));
        
        if (meteoraPair) {
          console.log('\n✅ Found on Meteora via DexScreener!');
          console.log('Pair Address:', meteoraPair.pairAddress);
          console.log('Price USD:', meteoraPair.priceUsd);
          console.log('Price Change 24h:', meteoraPair.priceChange?.h24, '%');
          console.log('Volume 24h:', meteoraPair.volume?.h24);
          console.log('Liquidity USD:', meteoraPair.liquidity?.usd);
          console.log('FDV:', meteoraPair.fdv);
          console.log('Market Cap:', meteoraPair.marketCap);
        }
      }
    }
    
  } catch (error) {
    console.error('Error fetching bonding curve:', error);
  }
}

// Run the test
fetchBondingCurveData();