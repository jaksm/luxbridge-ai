# Blockchain Development Guidelines

This directory contains the smart contract infrastructure for LuxBridge AI's Real-World Asset (RWA) tokenization and cross-platform trading system.

## Project Overview

The blockchain layer enables universal liquidity aggregation for RWAs through sophisticated smart contracts, automated market makers, and AI-powered automation. The system creates synthetic tokens representing RWA holdings across multiple platforms (Splint Invest, Masterworks, RealT) and enables seamless trading between different asset classes.

## Smart Contract Architecture

### Core Contracts

#### 1. RWATokenFactory (`contracts/core/RWATokenFactory.sol`)

- **Purpose**: Factory for creating and managing synthetic RWA tokens
- **Features**: Gas-optimized storage, platform management, RWA-20 compliance, batch operations, oracle integration
- **Key Functions**: `registerPlatform()`, `tokenizeAsset()`, `batchTokenization()`

#### 2. RWA20Token (`contracts/core/RWA20Token.sol`)

- **Purpose**: ERC-20 compliant tokens representing platform assets
- **Features**: Asset metadata storage, valuation tracking, burnable tokens, factory-controlled ownership
- **Standard**: Custom RWA-20 interface extending ERC-20

#### 3. LuxBridgeAMM (`contracts/core/LuxBridgeAMM.sol`)

- **Purpose**: Automated Market Maker for cross-platform asset swaps
- **Features**: Constant product formula (x \* y = k), multi-pool support, liquidity provision, configurable fees
- **Key Functions**: `createPool()`, `addLiquidity()`, `swap()`, `removeLiquidity()`

#### 4. LuxBridgePriceOracle (`contracts/oracles/LuxBridgePriceOracle.sol`)

- **Purpose**: Chainlink Functions integration for cross-platform pricing
- **Features**: WEB2 API integration, mock implementation for testing, arbitrage detection
- **Key Functions**: `updateAssetPrice()`, `getAssetPrice()`, `detectArbitrage()`

#### 5. LuxBridgeAutomation (`contracts/core/LuxBridgeAutomation.sol`)

- **Purpose**: EIP-7702 account abstraction for AI-powered trading
- **Features**: Delegated trading permissions, spending limits, automated execution
- **Key Functions**: `delegateTrading()`, `executeAutomatedTrade()`, `setTradingLimits()`

### RWA-20 Standard

Custom standard for tokenized Real-World Assets:

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

## Development Commands

### Compilation and Testing

```bash
npm run blockchain:compile    # Compile all contracts
npm run blockchain:test      # Run all tests
npm run blockchain:test test/unit/     # Unit tests only
npm run blockchain:test test/integration/  # Integration tests only
npm run typecheck           # TypeScript validation
```

### Local Development

```bash
npm run blockchain:node     # Start local Hardhat network
npm run blockchain:deploy   # Deploy complete system to localhost
```

### Specific Deployments

```bash
npx hardhat run scripts/deploy/01-deploy-factory.ts --network localhost
npx hardhat run scripts/deploy/02-deploy-amm.ts --network localhost
npx hardhat run scripts/deploy/03-deploy-oracle.ts --network localhost
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network localhost
```

### Network Deployments

```bash
# Zircuit testnet (main target for gas optimization)
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network zircuit

# Sepolia (for Chainlink Functions testing)
npx hardhat run scripts/deploy/03-deploy-oracle.ts --network sepolia
```

## Testing Framework

### Unit Testing Pattern

```typescript
describe("ContractName", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("ContractName");
    const contract = await Contract.deploy();
    return { contract, owner, alice, bob };
  }

  it("Should perform expected behavior", async function () {
    const { contract } = await loadFixture(deployFixture);
    await expect(contract.functionCall()).to.emit(contract, "EventName");
  });
});
```

### Integration Testing

- **End-to-end flows**: Cross-platform trading scenarios
- **Real contract interaction**: Factory → Token → AMM → Oracle integration
- **Error handling**: Edge cases and security validations

### Test Coverage Requirements

- All public/external functions must have unit tests
- Integration tests for multi-contract workflows
- Gas usage validation for Zircuit optimization
- Security test cases for access control and reentrancy

## Gas Optimization (Zircuit-Specific)

### Optimization Techniques

1. **Packed Storage**: Efficient struct packing in `RWATokenFactory`
2. **Batch Operations**: Reduced transaction overhead for multiple operations
3. **Minimal Storage Writes**: Event-driven architecture
4. **ViaIR Compilation**: Yul optimization pipeline enabled

### Performance Targets

- Token Creation: ~200k gas per asset
- AMM Swap: ~80k gas per trade
- Liquidity Operations: ~120k gas per add/remove
- Oracle Update: ~50k gas per price update

## Security Patterns

### Access Control

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    modifier onlyOracle() {
        require(msg.sender == priceOracle, "Only oracle");
        _;
    }
}
```

### Reentrancy Protection

```solidity
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MyContract is ReentrancyGuard {
    function sensitiveFunction() external nonReentrant {
        // Implementation
    }
}
```

### Input Validation

```solidity
function validateParams(uint256 amount, address token) internal pure {
    require(amount > 0, "Invalid amount");
    require(token != address(0), "Invalid token");
}
```

## The Graph Integration

### Subgraph Structure

```graphql
type Asset @entity {
  id: ID!
  platform: Platform!
  assetType: String!
  totalSupply: BigInt!
  lastValuation: BigInt!
  tokenizationEvents: [TokenizationEvent!]!
}

type CrossPlatformTrade @entity {
  id: ID!
  user: Bytes!
  sellAsset: Asset!
  buyAsset: Asset!
  executionPrice: BigInt!
  arbitrageSpread: BigInt!
}
```

### Deployment Commands

```bash
graph build
graph deploy --node http://localhost:8020 luxbridge/rwa-trading
graph deploy --product hosted-service your-github-username/luxbridge-rwa
```

## MCP Server Integration

### Blockchain Tool Pattern

```typescript
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
    const tx = await amm.swap(sellToken, buyToken, amount, minAmountOut);
    return { transactionHash: tx.hash };
  },
);
```

### Integration Flow

1. **Authentication**: Users authenticate via Privy to access MCP tools
2. **Tool Integration**: MCP tools call blockchain functions via ethers.js
3. **Event Monitoring**: Real-time updates via The Graph subscriptions
4. **AI Automation**: MCP AI agents trigger blockchain automation

## Environment Variables

### Required for Local Development

```bash
# Optional - uses default Hardhat accounts if not set
PRIVATE_KEY=0x...
```

### Required for Testnet Deployment

```bash
# Network RPC URLs
ZIRCUIT_RPC_URL=https://zircuit1.p2pify.com
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID

# Private key for deployment
PRIVATE_KEY=0x...

# API keys for contract verification
ZIRCUIT_API_KEY=...
ETHERSCAN_API_KEY=...

# Chainlink Functions (if using real oracle)
CHAINLINK_FUNCTIONS_SUBSCRIPTION_ID=...
```

## Code Principles

### Solidity Standards

- Use Solidity 0.8.24 with optimizer enabled
- Follow OpenZeppelin patterns for access control and security
- Implement comprehensive input validation
- Use events for off-chain indexing
- Optimize for gas efficiency on Zircuit

### TypeScript Integration

- Use TypeChain for type-safe contract interactions
- Maintain strict TypeScript configuration
- Follow existing patterns in test files

## Development Rules

### Pre-Implementation Requirements

1. **Always run typecheck before implementing new features**: `npm run typecheck`
2. **Always run blockchain:compile before testing**: Fix compilation errors first
3. **Write tests before or alongside implementation**: Follow TDD practices
4. **Review existing contract patterns**: Check similar implementations

### Testing Requirements

- Run `npm run typecheck` before running any new tests
- Run `npm run blockchain:compile` before testing new contracts
- Ensure all tests pass before proceeding with new development
- Write comprehensive tests for all new functionality
- Test both success and error scenarios
- Mock external dependencies (oracles, etc.) properly

### Commit Requirements

- **Only commit working and tested code**: All tests must pass
- **Make small logical commits**: One feature/fix per commit
- **Run full validation before each commit**:
  1. `npm run typecheck` - Fix all TypeScript errors
  2. `npm run blockchain:compile` - Fix all Solidity compilation errors
  3. `npm run blockchain:test` - Ensure all tests pass
  4. `npm run format` - Format code consistently
- **Never commit failing tests or broken contracts**
- **Include tests in the same commit as implementation**

### Contract Development Standards

- Use OpenZeppelin contracts for security-critical functionality
- Implement proper access control for all administrative functions
- Add comprehensive input validation
- Use ReentrancyGuard for state-changing functions
- Emit events for all significant state changes
- Follow gas optimization best practices
- Document complex logic with NatSpec comments

### Security Requirements

- All external/public functions must validate inputs
- Use proper access control modifiers
- Implement reentrancy protection where needed
- Avoid delegatecall unless absolutely necessary
- Test edge cases and error conditions
- Consider MEV and front-running implications

## Network Configuration

### Hardhat Local Network

- Chain ID: 31337
- Gas Limit: 12M (block), 30M (total)
- Auto-mining with 1s intervals
- Unlimited contract size for testing

### Zircuit Testnet

- Chain ID: 48899
- RPC: https://zircuit1.p2pify.com
- Explorer: https://explorer.zircuit.com
- Focus: Gas optimization and account abstraction

### Sepolia Testnet

- Chain ID: 11155111
- Usage: Chainlink Functions testing
- Explorer: https://sepolia.etherscan.io

## Deployment Scripts

### Script Organization

- `01-deploy-factory.ts` - Deploy RWATokenFactory
- `02-deploy-amm.ts` - Deploy LuxBridgeAMM
- `03-deploy-oracle.ts` - Deploy LuxBridgePriceOracle
- `04-deploy-full-system.ts` - Complete system deployment

### Deployment Pattern

```typescript
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Contract = await ethers.getContractFactory("ContractName");
  const contract = await Contract.deploy(constructorArgs);

  console.log("Contract deployed to:", await contract.getAddress());

  // Verify contract if on public network
  if (network.name !== "hardhat" && network.name !== "localhost") {
    await verifyContract(await contract.getAddress(), constructorArgs);
  }
}
```

## Future Enhancements

### Planned Features

1. **Multi-chain Support**: Bridge to other EVM networks
2. **Advanced Routing**: MEV-resistant swap optimization
3. **Yield Farming**: Liquidity mining rewards
4. **Insurance Integration**: Asset protection mechanisms
5. **Governance Token**: Decentralized protocol governance

### ETHGlobal Bounty Alignment

- **Zircuit ($10K)**: Gas-optimized contracts with account abstraction
- **Chainlink ($10K)**: Functions integration for cross-platform pricing
- **The Graph ($10K)**: Comprehensive subgraph with knowledge graphs

## Troubleshooting

### Common Issues

- **Compilation errors**: Check Solidity version and imports
- **Test failures**: Ensure clean deployment state between tests
- **Gas estimation**: Use appropriate gas limits for complex operations
- **Network connectivity**: Verify RPC URLs and private key configuration

### Debug Commands

```bash
npx hardhat console --network localhost
npx hardhat verify --network zircuit CONTRACT_ADDRESS
npx hardhat run scripts/debug/check-deployment.ts
```
