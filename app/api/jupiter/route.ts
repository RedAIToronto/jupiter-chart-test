import { NextRequest, NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.NEXT_PUBLIC_JUPITER_API_KEY || 'a8fa72b5-c442-47fb-b1e4-4ced7bea14a3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
  }

  try {
    // Build the Jupiter API URL
    const jupiterUrl = new URL(endpoint, 'https://api.jup.ag');
    
    // Copy all query params except 'endpoint'
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        jupiterUrl.searchParams.append(key, value);
      }
    });

    // Determine if this endpoint needs authentication
    const needsAuth = endpoint.includes('quote') || endpoint.includes('swap');
    
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    // Only add API key for endpoints that need it
    if (needsAuth && JUPITER_API_KEY) {
      headers['x-api-key'] = JUPITER_API_KEY;
    }

    const response = await fetch(jupiterUrl.toString(), {
      headers,
      next: { revalidate: 1 } // Cache for 1 second
    });

    const data = await response.json();
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Jupiter API' },
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

    // Build the Jupiter API URL
    const jupiterUrl = new URL(endpoint, 'https://api.jup.ag');
    
    // Swap endpoint always needs authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (JUPITER_API_KEY) {
      headers['x-api-key'] = JUPITER_API_KEY;
    }

    const response = await fetch(jupiterUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Jupiter API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Jupiter API' },
      { status: 500 }
    );
  }
}