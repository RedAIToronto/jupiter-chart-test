/**
 * Server-Sent Events (SSE) endpoint for real-time price feeds
 * This allows 1000s of clients to receive updates without hitting Jupiter API
 */

import { NextRequest } from 'next/server';

// Global price cache shared across all connections
const priceCache = new Map<string, { price: number; timestamp: number }>();
const clients = new Set<ReadableStreamDefaultController>();

// Update prices from Jupiter (runs on server, not per-client)
async function updatePrices() {
  try {
    // Get top tokens to track
    const tokens = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      // Add more popular tokens
    ];
    
    const response = await fetch(
      `https://api.jup.ag/price/v3?ids=${tokens.join(',')}`
    );
    
    if (response.ok) {
      const data = await response.json();
      Object.entries(data.data || {}).forEach(([token, info]: [string, any]) => {
        priceCache.set(token, {
          price: info.price,
          timestamp: Date.now()
        });
      });
      
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'price-update',
        data: Object.fromEntries(priceCache),
        timestamp: Date.now()
      });
      
      clients.forEach(controller => {
        try {
          controller.enqueue(`data: ${message}\n\n`);
        } catch (e) {
          // Client disconnected
          clients.delete(controller);
        }
      });
    }
  } catch (error) {
    console.error('Failed to update prices:', error);
  }
}

// Start price updater (runs once globally)
let priceUpdater: NodeJS.Timeout | null = null;
if (!priceUpdater) {
  priceUpdater = setInterval(updatePrices, 5000); // Update every 5 seconds
  updatePrices(); // Initial update
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set
      clients.add(controller);
      
      // Send initial data
      const initialData = JSON.stringify({
        type: 'connected',
        data: Object.fromEntries(priceCache),
        clientCount: clients.size,
        timestamp: Date.now()
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
      
      // Keep alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        } catch {
          clearInterval(keepAlive);
          clients.delete(controller);
        }
      }, 30000);
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        clients.delete(controller);
      });
    },
    
    cancel(controller) {
      clients.delete(controller);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}