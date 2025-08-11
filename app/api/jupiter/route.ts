import { NextRequest, NextResponse } from 'next/server';

// Jupiter API configuration
const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || 'a8fa72b5-c442-47fb-b1e4-4ced7bea14a3';

// Endpoint mapping for Pro II plan (50 RPS)
const ENDPOINT_CONFIG = {
  // Price API - Use v3, v2 is deprecated
  'price/v2': { base: 'https://api.jup.ag', path: 'price/v3', needsAuth: true },
  'price/v3': { base: 'https://api.jup.ag', path: 'price/v3', needsAuth: true },
  
  // Quote and Swap - Use Pro endpoints with auth
  'v6/quote': { base: 'https://api.jup.ag', path: 'v6/quote', needsAuth: true },
  'v6/swap': { base: 'https://api.jup.ag', path: 'v6/swap', needsAuth: true },
  
  // Token info endpoints
  'tokens': { base: 'https://api.jup.ag', path: 'tokens', needsAuth: false },
  'token-list': { base: 'https://api.jup.ag', path: 'token-list', needsAuth: false },
};

// Cache for successful responses (1 second TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000; // 1 second

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = request.url;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=59',
        'X-Cache': 'HIT'
      }
    });
  }

  try {
    // Get endpoint configuration
    const config = ENDPOINT_CONFIG[endpoint as keyof typeof ENDPOINT_CONFIG];
    
    let jupiterUrl: URL;
    let needsAuth = false;
    
    if (config) {
      // Use configured endpoint
      jupiterUrl = new URL(config.path, config.base);
      needsAuth = config.needsAuth;
    } else if (endpoint.startsWith('price/')) {
      // Handle price endpoints - redirect v2 to v3
      const path = endpoint.replace('price/v2', 'price/v3');
      jupiterUrl = new URL(path, 'https://api.jup.ag');
      needsAuth = false;
    } else {
      // Default to lite API for unknown endpoints
      jupiterUrl = new URL(endpoint, 'https://lite-api.jup.ag');
      needsAuth = false;
    }
    
    // Copy all query params except 'endpoint'
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        jupiterUrl.searchParams.append(key, value);
      }
    });

    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Only add API key if needed (Pro endpoints)
    if (needsAuth && JUPITER_API_KEY) {
      headers['x-api-key'] = JUPITER_API_KEY;
    }

    const response = await fetch(jupiterUrl.toString(), {
      headers,
      next: { revalidate: 0 } // Disable Next.js cache, use our own
    });

    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch {
      // If not JSON, return as is
      data = { message: text };
    }
    
    // Check for rate limiting
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Rate limited. Please try again later.', details: data },
        { 
          status: 429,
          headers: {
            'Retry-After': '2'
          }
        }
      );
    }
    
    // Check for authentication errors
    if (response.status === 401) {
      console.error('Jupiter API authentication error:', data);
      // Fall back to lite endpoints
      if (endpoint === 'v6/quote' || endpoint === 'v6/swap') {
        return NextResponse.json(
          { error: 'Authentication failed. Please check API configuration.' },
          { status: 401 }
        );
      }
    }
    
    if (!response.ok && response.status !== 401) {
      console.error('Jupiter API error:', response.status, data);
      return NextResponse.json(
        { error: data?.error || 'Failed to fetch from Jupiter API', details: data },
        { status: response.status }
      );
    }
    
    // Cache successful responses
    if (response.ok) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
      
      // Clean old cache entries
      if (cache.size > 100) {
        const now = Date.now();
        for (const [key, value] of cache.entries()) {
          if (now - value.timestamp > CACHE_TTL * 10) {
            cache.delete(key);
          }
        }
      }
    }
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=59',
        'X-Cache': 'MISS',
        'X-Jupiter-Endpoint': jupiterUrl.toString()
      }
    });
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Jupiter API', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, ...requestBody } = body;
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    // Get endpoint configuration
    const config = ENDPOINT_CONFIG[endpoint as keyof typeof ENDPOINT_CONFIG];
    
    let jupiterUrl: URL;
    let needsAuth = false;
    
    if (config) {
      jupiterUrl = new URL(config.path, config.base);
      needsAuth = config.needsAuth;
    } else {
      // Default to lite API for POST requests
      jupiterUrl = new URL(endpoint, 'https://lite-api.jup.ag');
      needsAuth = false;
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Only add API key if needed
    if (needsAuth && JUPITER_API_KEY) {
      headers['x-api-key'] = JUPITER_API_KEY;
    }

    const response = await fetch(jupiterUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    
    // Handle rate limiting
    if (response.status === 429) {
      return NextResponse.json(
        { error: 'Rate limited. Please try again later.', details: data },
        { 
          status: 429,
          headers: {
            'Retry-After': '2'
          }
        }
      );
    }
    
    if (!response.ok) {
      console.error('Jupiter API POST error:', response.status, data);
      return NextResponse.json(
        { error: data?.error || 'Failed to process request', details: data },
        { status: response.status }
      );
    }
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'X-Jupiter-Endpoint': jupiterUrl.toString()
      }
    });
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 }
    );
  }
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 60) {
      cache.delete(key);
    }
  }
}, 60000); // Clean every minute