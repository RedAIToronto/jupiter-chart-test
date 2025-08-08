// Client-side RPC wrapper that uses server API to avoid CORS
export class BrowserSafeRPC {
  private apiUrl: string = '/api/rpc';
  
  async getAccountInfo(address: string): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getAccountInfo',
        params: { address }
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
  
  async getMultipleAccountsInfo(addresses: string[]): Promise<any[]> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getMultipleAccountsInfo',
        params: { addresses }
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
  
  async getSlot(): Promise<number> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getSlot',
        params: {}
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
  
  async getBalance(address: string): Promise<number> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getBalance',
        params: { address }
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.result;
  }
}

// Singleton instance
let rpcClient: BrowserSafeRPC | null = null;

export function getRPCClient(): BrowserSafeRPC {
  if (!rpcClient) {
    rpcClient = new BrowserSafeRPC();
  }
  return rpcClient;
}