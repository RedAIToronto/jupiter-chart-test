/**
 * Scalable Price Client - Connects to SSE stream for real-time prices
 * This allows 1000s of users without hitting rate limits
 */

export class ScalablePriceClient {
  private eventSource: EventSource | null = null;
  private prices: Map<string, number> = new Map();
  private listeners: Set<(prices: Map<string, number>) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  
  constructor() {
    this.connect();
  }
  
  private connect() {
    try {
      // Connect to our SSE endpoint
      this.eventSource = new EventSource('/api/stream');
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'price-update' || data.type === 'connected') {
            // Update local price cache
            Object.entries(data.data || {}).forEach(([token, info]: [string, any]) => {
              this.prices.set(token, info.price || info);
            });
            
            // Notify all listeners
            this.notifyListeners();
          }
          
          // Reset reconnect counter on successful message
          this.reconnectAttempts = 0;
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.reconnect();
      };
      
      this.eventSource.onopen = () => {
        console.log('Connected to price stream');
        this.reconnectAttempts = 0;
      };
    } catch (error) {
      console.error('Failed to connect to price stream:', error);
      this.reconnect();
    }
  }
  
  private reconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      // Fall back to direct API calls
      this.fallbackToDirectAPI();
    }
  }
  
  private fallbackToDirectAPI() {
    // Fallback mechanism for when SSE fails
    setInterval(async () => {
      try {
        const tokens = Array.from(this.prices.keys()).slice(0, 50); // Limit to 50 tokens
        if (tokens.length === 0) return;
        
        const response = await fetch(`/api/jupiter?endpoint=price/v3&ids=${tokens.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          Object.entries(data.data || {}).forEach(([token, info]: [string, any]) => {
            this.prices.set(token, info.price);
          });
          this.notifyListeners();
        }
      } catch (error) {
        console.error('Fallback API call failed:', error);
      }
    }, 10000); // Update every 10 seconds in fallback mode
  }
  
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(new Map(this.prices));
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
  
  // Public API
  
  subscribe(callback: (prices: Map<string, number>) => void): () => void {
    this.listeners.add(callback);
    
    // Send current prices immediately
    if (this.prices.size > 0) {
      callback(new Map(this.prices));
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  getPrice(token: string): number | null {
    return this.prices.get(token) || null;
  }
  
  async requestPrice(token: string): Promise<number | null> {
    // Check cache first
    const cached = this.prices.get(token);
    if (cached) return cached;
    
    // Request specific token price
    try {
      const response = await fetch(`/api/jupiter?endpoint=price/v3&ids=${token}`);
      if (response.ok) {
        const data = await response.json();
        const price = data.data?.[token]?.price;
        if (price) {
          this.prices.set(token, price);
          this.notifyListeners();
          return price;
        }
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
    }
    
    return null;
  }
  
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let priceClient: ScalablePriceClient | null = null;

export function getScalablePriceClient(): ScalablePriceClient {
  if (!priceClient && typeof window !== 'undefined') {
    priceClient = new ScalablePriceClient();
  }
  return priceClient!;
}