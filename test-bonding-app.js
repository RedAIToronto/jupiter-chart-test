// Test using our app's Jupiter proxy
const tokenAddress = 'AcNVuNdwNwxqkG17qSqNdUvigwiub3fvBV2ZjHNpzVyw';

async function testAppAPI() {
  console.log(`\n🔍 Testing bonding curve for: ${tokenAddress}\n`);
  
  try {
    // Use lite-api.jup.ag which doesn't require auth
    console.log('Fetching from Lite API...');
    const response = await fetch(
      `https://lite-api.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Full Response:', JSON.stringify(data, null, 2));
      
      if (data.pools && data.pools.length > 0) {
        const pool = data.pools[0];
        
        if (pool.dex === 'met-dbc') {
          console.log('\n✅ METEORA DBC TOKEN FOUND!');
          console.log('================================');
          
          // Display all available data
          console.log('\n📊 Token Info:');
          console.log('Symbol:', pool.baseAsset?.symbol || 'N/A');
          console.log('Name:', pool.baseAsset?.name || 'N/A');
          console.log('Address:', pool.baseAsset?.id || tokenAddress);
          
          console.log('\n💰 Bonding Curve Data:');
          if (typeof pool.bondingCurve === 'number') {
            const percentage = pool.bondingCurve * 100;
            console.log(`BONDING CURVE PERCENTAGE: ${percentage.toFixed(2)}%`);
          } else {
            console.log('Bonding curve field not found in standard format');
          }
          
          // Check all possible fields for bonding data
          console.log('\n🔍 Checking all pool fields for bonding data:');
          Object.keys(pool).forEach(key => {
            if (key.toLowerCase().includes('bond') || 
                key.toLowerCase().includes('curve') || 
                key.toLowerCase().includes('progress') ||
                key.toLowerCase().includes('migration') ||
                key.toLowerCase().includes('sold')) {
              console.log(`${key}:`, pool[key]);
            }
          });
          
          // Check poolInfo if exists
          if (pool.poolInfo) {
            console.log('\n📦 Pool Info:');
            console.log(JSON.stringify(pool.poolInfo, null, 2));
          }
          
          // Check for custom Meteora fields
          if (pool.meteoraInfo) {
            console.log('\n🌟 Meteora Info:');
            console.log(JSON.stringify(pool.meteoraInfo, null, 2));
          }
          
          console.log('\n📈 Market Data:');
          console.log('Price USD:', pool.baseAsset?.usdPrice || 'Not available');
          console.log('Liquidity:', pool.liquidity || 'N/A');
          console.log('Volume 24h:', pool.volume24h || 'N/A');
          console.log('Market Cap:', pool.baseAsset?.mcap || pool.baseAsset?.fdv || 'N/A');
          
        } else {
          console.log(`Not a Meteora DBC token. DEX: ${pool.dex}`);
        }
      } else {
        console.log('No pools found');
      }
    } else {
      const errorText = await response.text();
      console.log('API Error:', response.status, errorText);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Also try the data API
async function tryDataAPI() {
  console.log('\n\n🔍 Trying Jupiter Data API...');
  
  try {
    const response = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('Data API Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Data API error:', response.status);
    }
  } catch (error) {
    console.error('Data API error:', error);
  }
}

// Run tests
testAppAPI().then(() => tryDataAPI());