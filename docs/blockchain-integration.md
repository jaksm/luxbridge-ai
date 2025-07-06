# LuxBridge AI Blockchain Integration

## Overview

LuxBridge AI integrates blockchain technology to enable tokenization and trading of Real-World Assets (RWAs) across multiple platforms. The system creates ERC-20 tokens representing fractional ownership of assets like wine, art, and real estate, enabling 24/7 trading through an Automated Market Maker (AMM).

## Architecture

### Smart Contracts

1. **RWATokenFactory** - Creates and manages tokenized assets
2. **LuxBridgeAMM** - Automated Market Maker for cross-platform trading
3. **LuxBridgePriceOracle** - Price feeds and cross-platform pricing
4. **LuxBridgeAutomation** - AI-powered automated trading

### Integration Points

- **MCP Tools** - 11 blockchain tools accessible via Model Context Protocol
- **Background Services** - 5 Next.js cron jobs for automated operations
- **SDK** - TypeScript SDK for blockchain interactions

## MCP Blockchain Tools

### Asset Management

#### `tokenize_asset`
Converts real-world assets into ERC-20 tokens on the blockchain.

**Parameters:**
- `platform` - Platform where asset originates (splint_invest, masterworks, realt)
- `assetId` - Unique identifier for the asset
- `apiAssetData` - Complete asset data from platform API

**Example:**
```typescript
{
  platform: "splint_invest",
  assetId: "BORDEAUX-2019",
  apiAssetData: { /* platform API response */ }
}
```

#### `get_asset_metadata`
Retrieves current blockchain metadata for a tokenized asset.

**Parameters:**
- `platform` - Asset platform
- `assetId` - Asset identifier

### Liquidity Operations

#### `add_liquidity`
Provides liquidity to AMM pools to earn trading fees.

**Parameters:**
- `tokenA` - First token contract address
- `tokenB` - Second token contract address
- `amountADesired` - Amount of tokenA to add
- `amountBDesired` - Amount of tokenB to add
- `amountAMin` - Minimum tokenA (slippage protection)
- `amountBMin` - Minimum tokenB (slippage protection)

#### `remove_liquidity`
Withdraws liquidity and claims earned fees.

**Parameters:**
- `tokenA` - First token address
- `tokenB` - Second token address
- `liquidity` - LP tokens to burn
- `amountAMin` - Minimum tokenA to receive
- `amountBMin` - Minimum tokenB to receive

### Trading Operations

#### `swap_tokens`
Executes direct token swaps through the AMM.

**Parameters:**
- `tokenIn` - Token being sold
- `tokenOut` - Token being bought
- `amountIn` - Amount to swap
- `amountOutMin` - Minimum output (slippage protection)

#### `get_swap_quote`
Preview swap results without executing.

**Parameters:**
- `tokenIn` - Token being sold
- `tokenOut` - Token being bought
- `amountIn` - Amount to calculate

### Automated Trading

#### `delegate_trading_permissions`
Grant AI agent trading permissions with limits.

**Parameters:**
- `maxTradeSize` - Max USD per trade (0 to revoke)
- `maxDailyVolume` - Max USD per day
- `allowedAssets` - Array of allowed token addresses

#### `queue_automated_trade`
Schedule trades for AI-optimized execution.

**Parameters:**
- `sellPlatform` - Platform of sell asset
- `sellAsset` - Asset to sell
- `buyPlatform` - Platform of buy asset
- `buyAsset` - Asset to buy
- `amount` - Amount to trade
- `minAmountOut` - Slippage protection
- `deadlineHours` - Expiry time

#### `execute_automated_trade`
Execute a queued trade immediately.

**Parameters:**
- `tradeId` - Unique trade identifier

### Analysis Tools

#### `calculate_arbitrage_opportunity`
Identify profitable cross-platform spreads.

**Parameters:**
- `assetId` - Asset to analyze
- `platformA` - First platform
- `platformB` - Second platform

#### `rebalance_portfolio`
Optimize portfolio to target allocations.

**Parameters:**
- `targetAllocation` - Target percentages by asset
- `maxSlippage` - Maximum acceptable slippage
- `minimumTradeSize` - Minimum trade size

## Background Services

### Price Synchronization
**Route:** `/api/cron/sync-asset-prices`
**Schedule:** Every 15 minutes
**Function:** Updates blockchain prices from platform APIs

### Arbitrage Detection
**Route:** `/api/cron/check-arbitrage`
**Schedule:** Every 5 minutes
**Function:** Identifies and executes profitable arbitrage

### Trade Execution
**Route:** `/api/cron/execute-queued-trades`
**Schedule:** Every 2 minutes
**Function:** Processes queued trades at optimal times

### Pool Optimization
**Route:** `/api/cron/optimize-pools`
**Schedule:** Daily
**Function:** Rebalances AMM pools for efficiency

### Portfolio Rebalancing
**Route:** `/api/cron/rebalance-portfolios`
**Schedule:** Daily
**Function:** Auto-rebalances user portfolios

## Usage Examples

### Tokenizing an Asset

```typescript
// First, get asset data from platform API
const assetData = await getAssetFromPlatform("splint_invest", "BORDEAUX-2019");

// Then tokenize it on blockchain
const result = await mcpClient.callTool("tokenize_asset", {
  platform: "splint_invest",
  assetId: "BORDEAUX-2019",
  apiAssetData: assetData
});
```

### Cross-Platform Trading

```typescript
// Get quote first
const quote = await mcpClient.callTool("get_swap_quote", {
  tokenIn: "0x123...", // Wine token
  tokenOut: "0x456...", // Art token
  amountIn: "1000"
});

// Execute swap with slippage protection
const swap = await mcpClient.callTool("swap_tokens", {
  tokenIn: "0x123...",
  tokenOut: "0x456...",
  amountIn: "1000",
  amountOutMin: quote.minAmountOut
});
```

### Automated Trading Setup

```typescript
// 1. Delegate permissions
await mcpClient.callTool("delegate_trading_permissions", {
  maxTradeSize: "1000",
  maxDailyVolume: "5000",
  allowedAssets: ["0x123...", "0x456...", "0x789..."]
});

// 2. Queue trades
await mcpClient.callTool("queue_automated_trade", {
  sellPlatform: "splint_invest",
  sellAsset: "BORDEAUX-2019",
  buyPlatform: "masterworks",
  buyAsset: "PICASSO-042",
  amount: "500",
  deadlineHours: 24
});
```

## Security Considerations

1. **Trading Limits** - All automated trades respect user-defined limits
2. **Slippage Protection** - Prevents unfavorable trades during volatility
3. **Permission Revocation** - Users can instantly revoke AI permissions
4. **Asset Restrictions** - AI can only trade pre-approved assets

## Network Configuration

Currently configured for localhost development:
- Network: Hardhat local node
- Chain ID: 31337
- RPC URL: http://localhost:8545

For production deployment:
- Zircuit Mainnet support ready
- Gasless transactions enabled
- Cross-chain compatibility planned

## Error Handling

Common errors and solutions:

### Insufficient Balance
- Verify token balance before trading
- Check both input token and gas token

### No Liquidity Pool
- Ensure both tokens are tokenized
- Check if pool exists for token pair

### Slippage Protection
- Adjust `amountOutMin` parameter
- Try smaller trade amounts

### Permission Denied
- Verify trading delegation is active
- Check asset is in allowed list

## Best Practices

1. **Always Get Quotes First** - Use `get_swap_quote` before trading
2. **Start Small** - Test with small amounts when delegating to AI
3. **Monitor Regularly** - Check AI trading activity frequently
4. **Use Slippage Protection** - Always set reasonable `minAmountOut`
5. **Batch Operations** - Use portfolio rebalancing for multiple trades

## Future Enhancements

- Real-time price feeds via Chainlink
- Cross-chain bridge integration
- Advanced AMM features (concentrated liquidity)
- Governance token and DAO structure
- Mobile wallet integration