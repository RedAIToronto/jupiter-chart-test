// RPC Load Balancer with health monitoring and fallback
import { Connection, PublicKey } from '@solana/web3.js';

interface RPCEndpoint {
  url: string;
  weight: number;
  healthy: boolean;
  responseTime: number;
  errors: number;
  lastCheck: number;
}

export class RPCLoadBalancer {
  private endpoints: RPCEndpoint[];
  private connections: Map<string, Connection> = new Map();
  private currentIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Use QuickNode RPC endpoint
    this.endpoints = [
      {
        url: 'https://billowing-alpha-borough.solana-mainnet.quiknode.pro/a03394eddb75c7558f4c17e7875eb6b59d0df60c/',
        weight: 10,
        healthy: true,
        responseTime: 0,
        errors: 0,
        lastCheck: Date.now()
      }
    ];

    // Create connections
    this.endpoints.forEach(endpoint => {
      this.connections.set(endpoint.url, new Connection(endpoint.url, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000
      }));
    });

    // Start health monitoring
    this.startHealthMonitoring();
  }

  // Get the best available connection
  async getConnection(): Promise<Connection> {
    // Sort by health score (healthy + low response time + low errors)
    const sorted = [...this.endpoints]
      .filter(e => e.healthy)
      .sort((a, b) => {
        const scoreA = this.calculateScore(a);
        const scoreB = this.calculateScore(b);
        return scoreB - scoreA;
      });

    if (sorted.length === 0) {
      // All endpoints unhealthy, try to recover
      await this.attemptRecovery();
      throw new Error('All RPC endpoints are unhealthy');
    }

    const selected = sorted[0];
    return this.connections.get(selected.url)!;
  }

  // Execute with automatic fallback
  async executeWithFallback<T>(
    operation: (conn: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    const errors: Array<{ endpoint: string; error: any }> = [];

    for (let i = 0; i < maxRetries; i++) {
      const healthyEndpoints = this.endpoints.filter(e => e.healthy);
      
      if (healthyEndpoints.length === 0) {
        await this.attemptRecovery();
        continue;
      }

      // Try each healthy endpoint
      for (const endpoint of healthyEndpoints) {
        try {
          const startTime = Date.now();
          const connection = this.connections.get(endpoint.url)!;
          const result = await operation(connection);
          
          // Update metrics on success
          endpoint.responseTime = Date.now() - startTime;
          endpoint.errors = Math.max(0, endpoint.errors - 1);
          
          return result;
        } catch (error) {
          errors.push({ endpoint: endpoint.url, error });
          endpoint.errors++;
          
          // Mark unhealthy if too many errors
          if (endpoint.errors > 5) {
            endpoint.healthy = false;
          }
        }
      }
    }

    throw new Error(`All RPC attempts failed: ${JSON.stringify(errors)}`);
  }

  // Batch requests across multiple endpoints for parallelization
  async batchExecute<T>(
    operations: Array<(conn: Connection) => Promise<T>>
  ): Promise<T[]> {
    const healthyEndpoints = this.endpoints.filter(e => e.healthy);
    const results: T[] = [];
    const promises: Promise<T>[] = [];

    // Distribute operations across healthy endpoints
    operations.forEach((operation, index) => {
      const endpoint = healthyEndpoints[index % healthyEndpoints.length];
      if (endpoint) {
        const connection = this.connections.get(endpoint.url)!;
        promises.push(
          operation(connection).catch(error => {
            endpoint.errors++;
            throw error;
          })
        );
      }
    });

    return Promise.all(promises);
  }

  private calculateScore(endpoint: RPCEndpoint): number {
    let score = endpoint.weight * 100;
    
    // Penalize for response time
    score -= endpoint.responseTime / 10;
    
    // Penalize for errors
    score -= endpoint.errors * 20;
    
    // Boost if recently checked and healthy
    if (Date.now() - endpoint.lastCheck < 5000 && endpoint.healthy) {
      score += 50;
    }
    
    return Math.max(0, score);
  }

  private startHealthMonitoring(): void {
    // Check health every 5 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkHealth();
    }, 5000);
  }

  private async checkHealth(): Promise<void> {
    const checks = this.endpoints.map(async (endpoint) => {
      try {
        const connection = this.connections.get(endpoint.url)!;
        const startTime = Date.now();
        
        // Simple health check - get slot
        await connection.getSlot();
        
        // Update metrics
        endpoint.responseTime = Date.now() - startTime;
        endpoint.healthy = true;
        endpoint.errors = Math.max(0, endpoint.errors - 1);
        endpoint.lastCheck = Date.now();
      } catch (error) {
        endpoint.errors++;
        if (endpoint.errors > 3) {
          endpoint.healthy = false;
        }
      }
    });

    await Promise.allSettled(checks);
  }

  private async attemptRecovery(): Promise<void> {
    console.log('Attempting to recover unhealthy endpoints...');
    
    // Reset all endpoints and recheck
    this.endpoints.forEach(endpoint => {
      endpoint.errors = 0;
      endpoint.healthy = true;
    });
    
    await this.checkHealth();
  }

  // Get current stats
  getStats() {
    return {
      endpoints: this.endpoints.map(e => ({
        url: e.url,
        healthy: e.healthy,
        responseTime: e.responseTime,
        errors: e.errors,
        score: this.calculateScore(e)
      })),
      healthyCount: this.endpoints.filter(e => e.healthy).length,
      totalCount: this.endpoints.length
    };
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Singleton instance
let rpcLoadBalancer: RPCLoadBalancer | null = null;

export function getRPCLoadBalancer(): RPCLoadBalancer {
  if (!rpcLoadBalancer) {
    rpcLoadBalancer = new RPCLoadBalancer();
  }
  return rpcLoadBalancer;
}