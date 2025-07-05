# LuxBridge Testnet Deployment Guide

## Quick Start (5 minutes)

### 1. Setup Environment

```bash
# Copy minimal template
cp .env.minimal .env.local

# Edit .env.local and add your private key
# PRIVATE_KEY=0x... (get from MetaMask: Account Details → Export Private Key)
```

### 2. Get Testnet ETH

- **Visit**: https://faucet.zircuit.com/
- **Request**: 0.05 ETH (more than enough)
- **Wait**: ~1-2 minutes for tokens

### 3. Deploy Contracts

```bash
# Navigate to blockchain directory
cd blockchain

# Deploy complete system to Zircuit testnet
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network zircuit
```

### 4. Verify Deployment

```bash
# Run verification script
node ../scripts/verify-deployment.js zircuit
```

## What Gets Deployed

The deployment creates a complete RWA trading ecosystem:

### Smart Contracts (5 total)

- **RWATokenFactory**: Creates tokenized real-world assets
- **LuxBridgeAMM**: Automated market maker for cross-platform trading
- **LuxBridgePriceOracle**: Mock price oracle (upgradeable to Chainlink)
- **LuxBridgeAutomation**: AI-powered automated trading
- **3x Demo Tokens**: Wine, Art, and Real Estate assets

### Demo Assets Created

- **BORDEAUX-2019** (Wine) - 1M tokens, $100k valuation
- **PICASSO-042** (Art) - 500k tokens, $200k valuation
- **DETROIT-HOUSE-001** (Real Estate) - 100k tokens, $50k valuation

### AMM Pools with Liquidity

- Wine ↔ Art pool (100k/50k tokens)
- Wine ↔ Real Estate pool
- Art ↔ Real Estate pool

## Cost Breakdown

### Zircuit Testnet (Recommended)

- **Total Gas**: ~14.5M gas
- **Gas Price**: ~2 gwei
- **Total Cost**: **~0.03 ETH**
- **Recommended Faucet Amount**: **0.05 ETH**

### What You Get

✅ Production-ready smart contracts  
✅ 3 tokenized demo assets  
✅ 3 active trading pools with liquidity  
✅ Mock price oracle with demo data  
✅ AI automation contract ready for delegation

## Troubleshooting

### "Insufficient funds" Error

```bash
# Check your balance
npx hardhat run --network zircuit scripts/check-balance.js

# Get more testnet ETH
# Visit: https://faucet.zircuit.com/
```

### "Network connection" Error

```bash
# Verify RPC URL in .env.local
echo $ZIRCUIT_RPC_URL
# Should be: https://zircuit1.p2pify.com
```

### "Private key" Error

```bash
# Verify private key format in .env.local
# Should start with 0x and be 64 characters long
```

## Advanced Setup (Multiple Networks)

### For Full Testing on Both Networks

```bash
# Use complete template
cp .env.template .env.local

# Fill in both network configurations:
# - ZIRCUIT_RPC_URL (no registration)
# - SEPOLIA_RPC_URL (requires MetaMask Developer account)
# - Optional: API keys for contract verification
```

### Deploy to Both Networks

```bash
# Deploy to Zircuit
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network zircuit

# Deploy to Sepolia
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network sepolia
```

## Next Steps After Deployment

1. **Save Contract Addresses**: Note down all deployed contract addresses
2. **Update MCP Server**: Configure contract addresses in SDK
3. **Test Trading**: Try cross-platform swaps between assets
4. **Verify Contracts**: Upload source code to block explorer (optional)
5. **Integration Testing**: Connect with MCP tools and frontend

## Files Created

- ✅ `.env.template` - Complete environment configuration
- ✅ `.env.minimal` - Quick setup for immediate testing
- ✅ `TESTNET_REQUIREMENTS.md` - Detailed gas analysis
- ✅ `scripts/verify-deployment.js` - Post-deployment verification
- ✅ `DEPLOYMENT_GUIDE.md` - This guide

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your environment variables
3. Ensure you have sufficient testnet ETH
4. Review the deployment logs for specific error messages
