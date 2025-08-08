#!/usr/bin/env node

/**
 * Jupiter API v6 Authentication Test Suite
 * 
 * This script tests different Jupiter API endpoints with various authentication approaches
 * to determine the correct implementation for each endpoint.
 */

const API_KEY = 'a8fa72b5-c442-47fb-b1e4-4ced7bea14a3';

// Test token addresses
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BONK_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  log(`\n${name}`, 'bright');
  log(`URL: ${url}`, 'cyan');
  
  const tests = [
    { name: 'No Authentication', headers: {} },
    { name: 'With x-api-key header', headers: { 'x-api-key': API_KEY } },
    { name: 'With Authorization Bearer', headers: { 'Authorization': `Bearer ${API_KEY}` } },
  ];
  
  for (const test of tests) {
    process.stdout.write(`  ${test.name}: `);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers,
          ...options.headers
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        log(`✅ SUCCESS (${response.status})`, 'green');
        
        // Show sample of response
        if (data) {
          const keys = Object.keys(data).slice(0, 3).join(', ');
          log(`     Response keys: ${keys}`, 'cyan');
        }
      } else {
        const errorText = await response.text().catch(() => '');
        log(`❌ FAILED (${response.status}) - ${errorText.substring(0, 100)}`, 'red');
      }
    } catch (error) {
      log(`❌ ERROR: ${error.message}`, 'red');
    }
  }
}

async function runTests() {
  log('\n======================================', 'bright');
  log('Jupiter API v6 Authentication Testing', 'bright');
  log('======================================', 'bright');
  log(`\nAPI Key: ${API_KEY}`, 'yellow');
  log(`Testing Date: ${new Date().toISOString()}`, 'yellow');
  
  // Test 1: Price API v2 (Deprecated, but still testing)
  log('\n\n1. PRICE API V2 (api.jup.ag)', 'bright');
  log('Note: This endpoint is deprecated and will be removed by August 2025', 'yellow');
  await testEndpoint(
    'Price v2 - Single Token',
    `https://api.jup.ag/price/v2?ids=${BONK_ADDRESS}`
  );
  
  // Test 2: Price API v2 with lite endpoint
  await testEndpoint(
    'Price v2 - Lite Endpoint',
    `https://lite-api.jup.ag/price/v2?ids=${BONK_ADDRESS}`
  );
  
  // Test 3: Price API v3 (Current version)
  log('\n\n2. PRICE API V3 (Current)', 'bright');
  await testEndpoint(
    'Price v3 - Pro Endpoint',
    `https://api.jup.ag/price/v3?ids=${BONK_ADDRESS}`
  );
  
  await testEndpoint(
    'Price v3 - Lite Endpoint',
    `https://lite-api.jup.ag/price/v3?ids=${BONK_ADDRESS}`
  );
  
  // Test 4: Quote API v6
  log('\n\n3. QUOTE API V6', 'bright');
  const quoteParams = new URLSearchParams({
    inputMint: SOL_ADDRESS,
    outputMint: USDC_ADDRESS,
    amount: '1000000000', // 1 SOL
    slippageBps: '50'
  });
  
  await testEndpoint(
    'Quote v6 - quote-api.jup.ag',
    `https://quote-api.jup.ag/v6/quote?${quoteParams}`
  );
  
  // Test 5: Swap API v1 Quote (New endpoint structure)
  log('\n\n4. SWAP API V1 QUOTE (New Structure)', 'bright');
  await testEndpoint(
    'Swap v1 Quote - Pro Endpoint',
    `https://api.jup.ag/swap/v1/quote?${quoteParams}`
  );
  
  await testEndpoint(
    'Swap v1 Quote - Lite Endpoint',
    `https://lite-api.jup.ag/swap/v1/quote?${quoteParams}`
  );
  
  // Test 6: Token API
  log('\n\n5. TOKEN API', 'bright');
  await testEndpoint(
    'Token List - Pro Endpoint',
    `https://api.jup.ag/tokens/v1`
  );
  
  await testEndpoint(
    'Token List - Lite Endpoint',
    `https://lite-api.jup.ag/tokens/v1`
  );
  
  // Test 7: Data API (Different service)
  log('\n\n6. DATA API (datapi.jup.ag)', 'bright');
  await testEndpoint(
    'Data API - Pools',
    `https://datapi.jup.ag/v1/pools?assetIds=${BONK_ADDRESS}`
  );
  
  // Summary
  log('\n\n======================================', 'bright');
  log('AUTHENTICATION SUMMARY', 'bright');
  log('======================================', 'bright');
  
  log('\nBased on Jupiter documentation and testing:', 'yellow');
  log('\n1. LITE ENDPOINTS (lite-api.jup.ag):', 'cyan');
  log('   - No authentication required', 'green');
  log('   - Lower rate limits (60-second window)', 'green');
  log('   - Same data freshness as Pro', 'green');
  
  log('\n2. PRO ENDPOINTS (api.jup.ag):', 'cyan');
  log('   - Requires x-api-key header for Pro plan features', 'green');
  log('   - Higher rate limits (10-second window)', 'green');
  log('   - Same data freshness as Lite', 'green');
  
  log('\n3. QUOTE API (quote-api.jup.ag/v6):', 'cyan');
  log('   - Legacy endpoint, being phased out', 'yellow');
  log('   - Use api.jup.ag/swap/v1/quote instead', 'green');
  
  log('\n4. DATA API (datapi.jup.ag):', 'cyan');
  log('   - Separate service for market data', 'green');
  log('   - No authentication required', 'green');
  
  log('\n5. PRICE API V2:', 'cyan');
  log('   - DEPRECATED - will be removed by August 2025', 'red');
  log('   - Migrate to Price API v3', 'yellow');
  
  log('\nRECOMMENDED IMPLEMENTATION:', 'bright');
  log('1. Use lite-api.jup.ag for development/testing', 'green');
  log('2. Use api.jup.ag with x-api-key header for production', 'green');
  log('3. Migrate from Price v2 to Price v3 immediately', 'green');
  log('4. Use /swap/v1/quote instead of /v6/quote', 'green');
  
  log('\nCORRECT HEADER FORMAT:', 'bright');
  log(`headers: {
  'Content-Type': 'application/json',
  'x-api-key': '${API_KEY}' // Only for api.jup.ag Pro endpoints
}`, 'cyan');
}

// Run the tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});