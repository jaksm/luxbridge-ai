# LuxBridge AI - Blockchain Infrastructure

> Universal liquidity aggregation for Real-World Assets (RWAs) powered by AI conversation

## Overview

This blockchain implementation enables cross-platform trading of tokenized Real-World Assets through sophisticated smart contracts, automated market makers, and AI-powered automation. The system creates synthetic tokens representing RWA holdings across multiple platforms (Splint Invest, Masterworks, RealT) and enables seamless trading between different asset classes.

## Architecture

### Core Contracts

#### 1. RWATokenFactory (`contracts/core/RWATokenFactory.sol`)

- **Purpose**: Factory for creating and managing synthetic RWA tokens
- **Features**:
  - Gas-optimized storage with packed structs
  - Platform registration and management
  - Asset tokenization with RWA-20 standard compliance
  - Batch operations for efficient deployment
  - Oracle integration for real-time valuations

#### 2. RWA20Token (`contracts/core/RWA20Token.sol`)

- **Purpose**: ERC-20 compliant tokens representing platform assets
- **Features**:
  - Asset metadata storage (platform, type, legal documents)
  - Valuation tracking with timestamps
  - Burnable tokens for platform settlement
  - Factory-controlled ownership for oracle updates

#### 3. LuxBridgeAMM (`contracts/core/LuxBridgeAMM.sol`)

- **Purpose**: Automated Market Maker for cross-platform asset swaps
- **Features**:
  - Constant product formula (x \* y = k)
  - Multi-pool support for different asset pairs
  - Liquidity provision and removal
  - Configurable swap fees
  - Route optimization for best prices

#### 4. LuxBridgePriceOracle (`contracts/oracles/LuxBridgePriceOracle.sol`)

- **Purpose**: Chainlink Functions integration for cross-platform pricing
- **Features**:
  - WEB2 API integration via Chainlink Functions
  - Mock implementation for local testing
  - Arbitrage opportunity detection
  - Cross-platform price comparison
  - Real-time valuation updates

#### 5. LuxBridgeAutomation (`contracts/core/LuxBridgeAutomation.sol`)

- **Purpose**: EIP-7702 account abstraction for AI-powered trading
- **Features**:
  - Delegated trading permissions with limits
  - AI agent execution framework
  - Daily spending limits and asset whitelists
  - Automated trade queuing and execution
  - Batch operation support

### RWA-20 Standard

The `IRWA20` interface defines a comprehensive standard for tokenized Real-World Assets:

```solidity
struct AssetMetadata {
    string platform;        // Origin platform identifier
    string assetId;        // Platform-specific asset ID
    uint256 totalSupply;   // Total fractional shares
    string assetType;      // Asset category (wine, art, real_estate)
    bytes32 legalHash;     // Legal document verification
    uint256 lastValuation; // Current market valuation
    uint256 valuationTimestamp; // Last update time
}
```

## Testing

### Unit Tests

Comprehensive test coverage for all contracts:

- **RWATokenFactory**: Platform management, asset tokenization, batch operations
- **LuxBridgeAMM**: Pool creation, liquidity management, swapping mechanics
- **All tests pass**: 13/13 for RWATokenFactory

### Integration Tests

End-to-end testing of complete trading flows:

- **Cross-platform trading**: Wine → Art token swaps
- **Arbitrage detection**: Price differential exploitation
- **AI automation**: Delegated trading with limits
- **Error handling**: Edge cases and security validations

### Running Tests

```bash
# All tests
npm run blockchain:test

# Unit tests only
npm run blockchain:test test/unit/

# Integration tests only
npm run blockchain:test test/integration/

# Specific test file
npx hardhat test test/unit/RWATokenFactory.test.ts
```

## Deployment

### Local Development

```bash
# Compile contracts
npm run blockchain:compile

# Start local blockchain
npm run blockchain:node

# Deploy complete system
npm run blockchain:deploy

# Deploy individual contracts
npx hardhat run scripts/deploy/01-deploy-factory.ts --network localhost
npx hardhat run scripts/deploy/02-deploy-amm.ts --network localhost
npx hardhat run scripts/deploy/03-deploy-oracle.ts --network localhost
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network localhost
```

### Testnet Deployment

```bash
# Configure environment variables
cp .env.example .env
# Edit .env with your private keys and RPC URLs

# Deploy to Zircuit testnet
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network zircuit

# Deploy to Sepolia (for Chainlink Functions)
npx hardhat run scripts/deploy/03-deploy-oracle.ts --network sepolia
```

## The Graph Integration

### Subgraph Configuration

The system includes comprehensive indexing for all contract events:

- **Platforms**: Registration and statistics tracking
- **Assets**: Tokenization events and metadata
- **Trading**: Cross-platform swaps and arbitrage
- **Liquidity**: Pool operations and provider tracking
- **Pricing**: Oracle updates and market data

### Key Entities

```graphql
type Asset @entity {
  id: ID!
  platform: Platform!
  assetType: String!
  totalSupply: BigInt!
  lastValuation: BigInt!
  tokenizationEvents: [TokenizationEvent!]!
  # ... additional fields
}

type CrossPlatformTrade @entity {
  id: ID!
  user: Bytes!
  sellAsset: Asset!
  buyAsset: Asset!
  executionPrice: BigInt!
  arbitrageSpread: BigInt!
  # ... additional fields
}
```

### Deployment

```bash
# Build subgraph
graph build

# Deploy to local Graph node
graph deploy --node http://localhost:8020 luxbridge/rwa-trading

# Deploy to hosted service
graph deploy --product hosted-service your-github-username/luxbridge-rwa
```

## Gas Optimization Features

### Zircuit-Specific Optimizations

1. **Packed Storage**: Efficient struct packing in `RWATokenFactory`
2. **Batch Operations**: Reduced transaction overhead
3. **Minimal Storage Writes**: Event-driven architecture
4. **Optimized Compilation**: ViaIR pipeline with Yul optimization

### Performance Metrics

- **Token Creation**: ~200k gas per asset
- **AMM Swap**: ~80k gas per trade
- **Liquidity Operations**: ~120k gas per add/remove
- **Oracle Update**: ~50k gas per price update

## Security Features

### Access Control

- **Factory Owner**: Platform registration and oracle configuration
- **Token Ownership**: Factory-controlled for oracle price updates
- **AI Agent Authorization**: Restricted automated trading permissions
- **User Permissions**: Granular delegation with limits

### Safety Mechanisms

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Input Validation**: Comprehensive parameter checking
- **Circuit Breakers**: Trade size and frequency limits
- **Slippage Protection**: Minimum output requirements

## Integration with MCP Server

The blockchain layer is designed to integrate seamlessly with the existing MCP server:

1. **Authentication**: Users authenticate via Privy to access MCP tools
2. **Tool Integration**: MCP tools call blockchain functions via ethers.js
3. **Event Monitoring**: Real-time updates via The Graph subscriptions
4. **AI Automation**: MCP AI agents trigger blockchain automation

### Example MCP Tool Integration

```typescript
// MCP tool for cross-platform trading
server.tool(
  "execute_cross_platform_trade",
  "Trade assets between different RWA platforms",
  z.object({
    sellAsset: z.string(),
    buyAsset: z.string(),
    amount: z.string(),
    minAmountOut: z.string(),
  }),
  async ({ sellAsset, buyAsset, amount, minAmountOut }) => {
    // Call blockchain via ethers.js
    const tx = await amm.swap(sellToken, buyToken, amount, minAmountOut);
    return { transactionHash: tx.hash };
  },
);
```

## Future Enhancements

### Planned Features

1. **Multi-chain Support**: Bridge to other EVM networks
2. **Advanced Routing**: MEV-resistant swap optimization
3. **Yield Farming**: Liquidity mining rewards
4. **Insurance Integration**: Asset protection mechanisms
5. **Governance Token**: Decentralized protocol governance

### Bounty Implementations

The contracts are designed to qualify for multiple ETHGlobal bounties:

- **Zircuit ($10K)**: Gas-optimized contracts with account abstraction
- **Chainlink ($10K)**: Functions integration for cross-platform pricing
- **The Graph ($10K)**: Comprehensive subgraph with knowledge graphs
- **Privy ($5K)**: Seamless authentication integration (MCP layer)

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive tests
4. Ensure all tests pass
5. Submit a pull request

For questions or support, please open an issue in the repository.
