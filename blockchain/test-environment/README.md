# Blockchain Tool Testing Framework

This directory contains the comprehensive testing framework for LuxBridge AI's blockchain MCP tools.

## Overview

The testing framework allows you to:
- Test all 11 blockchain MCP tools locally without authentication
- Run end-to-end integration scenarios
- Validate smart contract interactions
- Verify tool error handling and edge cases

## Quick Start

### 1. Run All Tests (Recommended)

```bash
# Run complete test suite with setup and cleanup
npm run test:tools

# With verbose output
npm run test:tools:verbose

# Run integration scenarios
npm run test:scenarios

# Run everything
npm run test:integration
```

### 2. Manual Testing Steps

```bash
# 1. Start local Hardhat node (in separate terminal)
npm run blockchain:node

# 2. Setup test environment
npm run test:tools:setup

# 3. Run individual tool tests (no setup/cleanup)
npm run test:tools:individual

# 4. Clean up when done
npm run test:tools:cleanup
```

## Tool Coverage

### ✅ Implemented Tools (3/11)
- `tokenize_asset` - Convert RWAs to blockchain tokens
- `get_asset_metadata` - Retrieve on-chain asset information  
- `add_liquidity` - Provide liquidity to AMM pools

### 🚧 To Be Implemented (8/11)
- `remove_liquidity` - Withdraw liquidity from pools
- `swap_tokens` - Execute token swaps via AMM
- `get_swap_quote` - Preview swap results
- `delegate_trading_permissions` - Grant AI trading rights
- `queue_automated_trade` - Schedule automated trades
- `execute_automated_trade` - Execute queued trades
- `calculate_arbitrage_opportunity` - Find cross-platform arbitrage
- `rebalance_portfolio` - Optimize portfolio allocation

## Test Architecture

### Core Components

#### `setup-local-chain.ts`
- Deploys complete smart contract system to local Hardhat chain
- Registers platforms (Splint Invest, Masterworks, RealT)
- Saves contract addresses for tests
- Returns deployment configuration

#### `mock-access-token.ts`
- Creates realistic AccessToken objects for testing
- Provides test user data (email, wallet, Privy ID)
- Supports multiple test users with different accounts

#### `test-auth-bypass.ts`
- Bypasses OAuth authentication for testing
- Allows direct tool execution without authentication flow
- Maintains proper AccessToken structure

#### `tool-test-helpers.ts`
- `ToolTester` class for running MCP tools
- Test result tracking and summary generation
- Sample asset data generation utilities

### Test Structure

```
blockchain/test-environment/
├── setup-local-chain.ts       # Local chain deployment
├── cleanup-environment.ts     # Test cleanup
├── mock-access-token.ts       # Mock authentication
├── test-auth-bypass.ts        # Auth bypass logic
└── contract-addresses.json    # Generated contract addresses

blockchain/test-tools/
├── tool-test-helpers.ts       # Testing utilities
├── test-{tool-name}.ts        # Individual tool tests
└── test-all-tools.ts          # Comprehensive test runner

blockchain/test-scenarios/
├── end-to-end-trading.ts      # Complete trading workflow
└── cross-platform-arbitrage.ts # Arbitrage detection
```

## Test Scenarios

### End-to-End Trading
1. Tokenize wine asset (Splint Invest)
2. Tokenize art asset (Masterworks)  
3. Verify asset metadata
4. Add liquidity to create WINE/ART pool
5. Execute swap from wine to art
6. Verify final state

### Cross-Platform Arbitrage
1. Create same asset on different platforms with different prices
2. Set up liquidity pools for both versions
3. Detect arbitrage opportunities
4. Test edge cases (non-existent assets, small amounts)

## Usage Examples

### Run Specific Tool Test

```bash
cd blockchain
npx tsx test-tools/test-tokenize-asset.ts
```

### Custom Test Configuration

```typescript
import { ToolTester } from "./tool-test-helpers";
import { enableAuthBypass } from "../test-environment/test-auth-bypass";

// Enable auth bypass
enableAuthBypass();

// Create custom test
const tester = new ToolTester(server, { verbose: true });
const result = await tester.testTool("tokenize_asset", {
  platform: "splint_invest",
  assetId: "CUSTOM-001",
  apiAssetData: customAssetData,
});
```

### Mock User Data

```typescript
import { createMockAccessTokenForUser } from "./mock-access-token";

// Use different test users
const alice = createMockAccessTokenForUser(0); // First user
const bob = createMockAccessTokenForUser(1);   // Second user
const charlie = createMockAccessTokenForUser(2); // Third user
```

## Expected Test Results

### Successful Tests
- Tool execution without authentication errors
- Valid blockchain transactions and state changes
- Proper error handling for invalid inputs
- Consistent tool return value formats

### Common Failure Cases
- Missing contract deployments (run setup first)
- Insufficient token balances (test limitation)
- Invalid tool parameters (expected behavior)
- Network connectivity issues

## Troubleshooting

### "No contract addresses found"
```bash
# Run setup first
npm run test:tools:setup
```

### "Failed to create mock access token"
```bash
# Check if auth bypass is enabled
enableAuthBypass();
```

### "Tool execution timeout"
```bash
# Restart local Hardhat node
npm run blockchain:node
```

### Test Cleanup Issues
```bash
# Manual cleanup
npm run test:tools:cleanup
rm -f blockchain/test-environment/contract-addresses.json
```

## Development

### Adding New Tool Tests

1. Create test file: `test-tools/test-{tool-name}.ts`
2. Follow existing patterns in `test-tokenize-asset.ts`
3. Add to `ALL_TOOL_TESTS` array in `test-all-tools.ts`
4. Test both success and failure scenarios

### Adding New Scenarios

1. Create scenario file: `test-scenarios/{scenario-name}.ts`
2. Use multiple tools in sequence
3. Verify end-to-end workflows
4. Add to npm scripts in `package.json`

## Integration with CI/CD

The test framework is designed for local development and can be integrated into CI/CD:

```yaml
# GitHub Actions example
- name: Test Blockchain Tools
  run: |
    npm install
    npm run blockchain:compile
    npm run test:tools
    npm run test:scenarios
```

## Next Steps

1. **Complete Tool Coverage**: Implement remaining 8 tool tests
2. **Advanced Scenarios**: Add more complex integration tests  
3. **Performance Testing**: Add gas usage and timing validation
4. **Error Simulation**: Test network failures and edge cases
5. **Parallel Execution**: Optimize test suite performance