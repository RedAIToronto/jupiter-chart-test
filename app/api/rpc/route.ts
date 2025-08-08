import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

// Use QuickNode RPC endpoint
const RPC_ENDPOINT = 'https://billowing-alpha-borough.solana-mainnet.quiknode.pro/a03394eddb75c7558f4c17e7875eb6b59d0df60c/';

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json();
    
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    let result;
    switch (method) {
      case 'getAccountInfo':
        result = await connection.getAccountInfo(new PublicKey(params.address));
        break;
      case 'getMultipleAccountsInfo':
        result = await connection.getMultipleAccountsInfo(
          params.addresses.map((addr: string) => new PublicKey(addr))
        );
        break;
      case 'getSlot':
        result = await connection.getSlot();
        break;
      case 'getBalance':
        result = await connection.getBalance(new PublicKey(params.address));
        break;
      case 'getTokenAccountBalance':
        result = await connection.getTokenAccountBalance(new PublicKey(params.address));
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    return NextResponse.json({ result, endpoint: RPC_ENDPOINT });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'RPC request failed' },
      { status: 500 }
    );
  }
}