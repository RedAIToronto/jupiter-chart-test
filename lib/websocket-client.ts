// WebSocket client for real-time updates
export interface PriceUpdate {
  configAddress: string;
  price: number;
  volume24h: number;
  marketCap: number;
  change24h: number;
  timestamp: number;
}

export interface TradeUpdate {
  configAddress: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  trader: string;
  timestamp: number;
}

type UpdateCallback = (data: any) => void;

export class RealtimeWebSocketClient {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Set<UpdateCallback>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private messageQueue: any[] = [];
  private url: string;

  constructor(url?: string) {
    // For now, disable WebSocket until we have a real endpoint
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || '';
    if (this.url) {
      this.connect();
    }
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Send queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
      
      // Resubscribe to all channels
      this.resubscribe();
      
      // Start ping/pong to keep connection alive
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      this.stopPing();
      this.scheduleReconnect();
    };
  }

  private handleMessage(data: any): void {
    const { type, configAddress, channel, payload } = data;

    // Handle different message types
    switch (type) {
      case 'price':
        this.notifySubscribers(`${configAddress}:price`, payload);
        break;
      case 'trade':
        this.notifySubscribers(`${configAddress}:trades`, payload);
        break;
      case 'volume':
        this.notifySubscribers(`${configAddress}:volume`, payload);
        break;
      case 'pong':
        // Keep-alive response
        break;
      default:
        // Generic channel update
        if (configAddress && channel) {
          this.notifySubscribers(`${configAddress}:${channel}`, payload);
        }
    }
  }

  private notifySubscribers(key: string, data: any): void {
    const callbacks = this.subscriptions.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  // Subscribe to updates for a specific token
  subscribe(
    configAddress: string,
    channel: 'price' | 'trades' | 'volume' | 'all',
    callback: UpdateCallback
  ): () => void {
    const key = `${configAddress}:${channel}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      
      // Send subscription message
      this.send({
        type: 'subscribe',
        configAddress,
        channels: channel === 'all' ? ['price', 'trades', 'volume'] : [channel]
      });
    }
    
    this.subscriptions.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        
        if (callbacks.size === 0) {
          this.subscriptions.delete(key);
          
          // Send unsubscribe message
          this.send({
            type: 'unsubscribe',
            configAddress,
            channels: channel === 'all' ? ['price', 'trades', 'volume'] : [channel]
          });
        }
      }
    };
  }

  // Subscribe to multiple tokens at once
  subscribeMany(
    configs: Array<{ address: string; channels: string[] }>,
    callback: UpdateCallback
  ): () => void {
    const unsubscribes: Array<() => void> = [];
    
    for (const config of configs) {
      for (const channel of config.channels) {
        const unsub = this.subscribe(
          config.address,
          channel as any,
          callback
        );
        unsubscribes.push(unsub);
      }
    }
    
    // Return function to unsubscribe from all
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  private send(message: any): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message to send when reconnected
      this.messageQueue.push(message);
    }
  }

  private resubscribe(): void {
    // Extract unique subscriptions and resubscribe
    const subscriptionMap = new Map<string, Set<string>>();
    
    this.subscriptions.forEach((_, key) => {
      const [configAddress, channel] = key.split(':');
      
      if (!subscriptionMap.has(configAddress)) {
        subscriptionMap.set(configAddress, new Set());
      }
      
      subscriptionMap.get(configAddress)!.add(channel);
    });
    
    subscriptionMap.forEach((channels, configAddress) => {
      this.send({
        type: 'subscribe',
        configAddress,
        channels: Array.from(channels)
      });
    });
  }

  private startPing(): void {
    this.stopPing();
    
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // Get connection status
  getStatus(): { connected: boolean; subscriptions: number } {
    return {
      connected: this.isConnected,
      subscriptions: this.subscriptions.size
    };
  }

  // Cleanup
  destroy(): void {
    this.stopPing();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscriptions.clear();
    this.messageQueue = [];
  }
}

// Singleton instance
let wsClient: RealtimeWebSocketClient | null = null;

export function getWebSocketClient(): RealtimeWebSocketClient {
  if (typeof window === 'undefined') {
    // Don't create WebSocket on server side
    return null as any;
  }
  
  if (!wsClient) {
    wsClient = new RealtimeWebSocketClient();
  }
  
  return wsClient;
}