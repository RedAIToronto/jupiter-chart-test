# 🔐 Real Wallet Connection Setup

## Quick Install Commands

Run these commands to set up real wallet connection:

```bash
# Install core Solana packages
npm install @solana/web3.js@^1.95.0

# Install wallet adapter packages
npm install @solana/wallet-adapter-base@^0.9.23
npm install @solana/wallet-adapter-react@^0.15.35
npm install @solana/wallet-adapter-react-ui@^0.9.35
npm install @solana/wallet-adapter-wallets@^0.19.32
```

If you get errors, try:
```bash
npm install --force
```

## What's Now Working

✅ **Real Wallet Connection**
- Connect Phantom, Solflare, or Backpack wallets
- See your actual SOL balance
- Sign and send real transactions

✅ **Live Token Swapping**
- Get real quotes from Jupiter
- Execute actual swaps on mainnet
- See transaction confirmations

✅ **Balance Display**
- Shows your real SOL balance
- Updates after transactions
- MAX button to use all available balance

## How to Use

1. **Connect Your Wallet**
   - Click "Connect Wallet" button
   - Select your wallet (Phantom recommended)
   - Approve the connection

2. **Make a Swap**
   - Enter amount of SOL or tokens
   - Check the price impact
   - Adjust slippage if needed (default 1%)
   - Click "Swap" and approve in wallet
   - Wait for confirmation

3. **View Transaction**
   - After swap, you'll get a Solscan link
   - Check your transaction on-chain
   - Balance updates automatically

## Important Notes

⚠️ **This uses REAL MAINNET**
- Transactions are real and cost SOL
- Always double-check amounts
- Start with small test amounts

💰 **Transaction Fees**
- Each swap costs ~0.00025 SOL
- Keep at least 0.01 SOL for fees
- Failed txs still cost fees

🎯 **Slippage Settings**
- 0.5% - For stable, liquid tokens
- 1% - Default, works for most
- 2% - For volatile tokens
- 5% - For very volatile or low liquidity

## Testing Tokens

### High Liquidity (Low slippage)
- BONK: `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`
- WIF: `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm`
- JUP: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`

### Fresh DBC Token (High slippage)
- `b5HpsgM4DkoQweD4aqjfKsoZ8amCsUK5KoiFFCbWodp`

## Troubleshooting

### "Transaction failed"
- Increase slippage tolerance
- Reduce trade size
- Check you have enough SOL for fees

### "Wallet not detected"
- Install Phantom: https://phantom.app
- Refresh the page after installing
- Make sure wallet is unlocked

### "Insufficient balance"
- You need SOL for fees + swap amount
- Leave at least 0.01 SOL for fees
- Check your wallet balance

### "User rejected"
- You cancelled in your wallet
- No fees charged for cancelled txs

## Security Tips

🔒 **Stay Safe**
- Never share your seed phrase
- Always verify transaction details
- Check token addresses carefully
- Start with small amounts to test

## What's Happening Behind the Scenes

1. **Quote Request** → Jupiter API finds best route
2. **Transaction Build** → Creates swap instruction
3. **Wallet Sign** → You approve in wallet
4. **Send to Chain** → Transaction sent to Solana
5. **Confirmation** → Wait for blockchain confirmation
6. **Success** → Tokens swapped, balances updated

Enjoy trading with real wallets! 🚀