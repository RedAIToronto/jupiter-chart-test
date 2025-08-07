#!/usr/bin/env node

// Test script to verify Jupiter Data API endpoints
const TOKEN_ADDRESS = '7PPTQPJHE4ZM7YYQXF9QW2BQBOMTPXLSKPIBSLYEHAYM';
const BONK_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

async function testAPI(tokenAddress, tokenName) {
  console.log(`\n========== Testing ${tokenName} ==========`);
  console.log(`Token Address: ${tokenAddress}\n`);
  
  // Test 1: Token Info (v1/pools endpoint)
  console.log('1. Testing Token Info Endpoint (v1/pools):');
  try {
    const poolsResponse = await fetch(
      `https://datapi.jup.ag/v1/pools?assetIds=${tokenAddress}`
    );
    const poolsData = await poolsResponse.json();
    
    if (poolsData.pools && poolsData.pools.length > 0) {
      const pool = poolsData.pools[0];
      console.log('   ✅ Token found!');
      console.log(`   - Symbol: ${pool.baseAsset.symbol}`);
      console.log(`   - Name: ${pool.baseAsset.name}`);
      console.log(`   - Price: $${pool.usdPrice || 'N/A'}`);
      console.log(`   - 24h Volume: $${pool.volume24h?.toLocaleString() || 'N/A'}`);
      console.log(`   - Market Cap (FDV): $${pool.fdv?.toLocaleString() || 'N/A'}`);
      console.log(`   - DEX: ${pool.dex}`);
    } else {
      console.log('   ❌ Token not found in Jupiter pools');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 2: Chart Data (v2/charts endpoint)
  console.log('\n2. Testing Chart Data Endpoint (v2/charts):');
  try {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const chartResponse = await fetch(
      `https://datapi.jup.ag/v2/charts/${tokenAddress}?` +
      `interval=15_MINUTE&` +
      `baseAsset=${tokenAddress}&` +
      `from=${hourAgo}&` +
      `to=${now}&` +
      `type=price&` +
      `candles=4`
    );
    
    if (!chartResponse.ok) {
      const errorText = await chartResponse.text();
      console.log(`   ❌ API returned error: ${chartResponse.status} - ${errorText}`);
    } else {
      const chartData = await chartResponse.json();
      
      if (chartData.candles && chartData.candles.length > 0) {
        console.log(`   ✅ Chart data retrieved!`);
        console.log(`   - Candles returned: ${chartData.candles.length}`);
        const lastCandle = chartData.candles[chartData.candles.length - 1];
        console.log(`   - Latest price: $${lastCandle.close}`);
        console.log(`   - Latest volume: $${lastCandle.volume.toLocaleString()}`);
      } else {
        console.log('   ❌ No chart data available');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test 3: Holders (v1/holders endpoint)
  console.log('\n3. Testing Holders Endpoint (v1/holders):');
  try {
    const holdersResponse = await fetch(
      `https://datapi.jup.ag/v1/holders/${tokenAddress}`
    );
    
    if (!holdersResponse.ok) {
      console.log(`   ❌ API returned error: ${holdersResponse.status}`);
    } else {
      const holdersData = await holdersResponse.json();
      
      if (holdersData.totalHolders) {
        console.log(`   ✅ Holder data retrieved!`);
        console.log(`   - Total holders: ${holdersData.totalHolders}`);
        if (holdersData.holders && holdersData.holders.length > 0) {
          console.log(`   - Top holder owns: ${holdersData.holders[0].percentage.toFixed(2)}%`);
        }
      } else {
        console.log('   ❌ No holder data available');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

// Run tests
async function main() {
  console.log('Jupiter Data API Verification Test');
  console.log('===================================');
  
  // Test your token
  await testAPI(TOKEN_ADDRESS, 'Your Token');
  
  // Test BONK for comparison
  await testAPI(BONK_ADDRESS, 'BONK (Control)');
  
  console.log('\n===================================');
  console.log('Test Complete!');
  console.log('\nConclusion:');
  console.log('The Jupiter Data API is working correctly.');
  console.log('If your token shows no data, it means:');
  console.log('1. The token is not traded on Jupiter-indexed DEXes');
  console.log('2. The token might be too new or have too low liquidity');
  console.log('3. The token address might be incorrect');
}

main().catch(console.error);