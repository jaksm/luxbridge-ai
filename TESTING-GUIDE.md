# 🧪 Local Testing Guide for MCP Tools

This guide shows you how to test the newly implemented MCP tools with realistic mock responses.

## ✅ Tests Currently Passing

All 6 core MCP tools are working with realistic mock data:

1. **`get_auth_state`** - User authentication and session info
2. **`get_asset`** - Detailed asset information from platforms  
3. **`get_portfolio`** - Cross-platform portfolio analytics
4. **`semantic_search`** - AI-powered asset discovery
5. **`tokenize_asset`** - Blockchain asset tokenization
6. **`swap_tokens`** - DeFi token trading simulation

## 🚀 Quick Testing Methods

### Method 1: Unit Tests (Recommended)

```bash
# Run the local test suite
npm test __tests__/test-tools-locally.test.ts

# This will show realistic outputs for all tools
```

### Method 2: Start Development Server

```bash
# Start the Next.js server
npm run dev

# Server will be available at http://localhost:3000 or 3001
```

### Method 3: Direct Tool Testing

```bash
# Run the test helper script
node test-mcp-tools.js
```

## 📊 Sample Test Results

### Authentication State
```
✅ Authentication successful!

**User Profile:**
- Name: Alex Chen
- Email: investor@luxbridge.ai  
- Wallet: 0x742d35Cc6634C0532925a3b8F33C7D1C93F9e7A2
- KYC Status: verified
- Tier: premium

**Connected Platforms:**
- Splint Invest: ✅ Connected
- Masterworks: ✅ Connected  
- RealT: ❌ Not connected
```

### Portfolio Analysis
```
📊 Complete Portfolio Analysis

**Summary:**
- Total Value: $142,750
- Total Gain: $8,265 (6.14%)
- Holdings: 7 assets across 2 platforms
- Monthly Income: $144.00

**Asset Allocation:**
- Art: 86.7% ($123,800)
- Wine: 2.8% ($4,045)
- Real Estate: 10.5% ($15,000)
```

### Semantic Search Results
```
🔍 Semantic Search Results

Query: "luxury wine investments"
Found: 3 matching assets
Platform(s): splint_invest

**Search Insights:**
- Average Expected Yield: 13.07%
- Total Investment Opportunity: $80,189
- Risk Distribution: 1 low, 1 moderate, 1 high
```

### Asset Tokenization
```
✅ Asset Successfully Tokenized!

**Blockchain Transaction:**
- Transaction Hash: 0xd89929ce1ab8a...
- Block Number: 12,346,480
- Gas Used: 2,456,782
- Gas Fee: 0.0234 ETH

**Token Contract Details:**
- Contract Address: 0xc0f0e9b16790b...
- Token Symbol: MASTERWORKS_MONETWL2023004
- Total Supply: 10,000 tokens
```

### Token Swap
```
✅ Token Swap Successful!

**Trade Executed:**
- Sold: 100 WINE-001 → Received: 87.2341 ART-042
- Exchange Rate: 0.872341
- Price Impact: 1.243%
- Trading Fee: 0.262 ART-042 (0.3%)
```

## 🔧 Advanced Testing

### Testing Specific Use Cases

```javascript
// Test different semantic searches
{
  query: "high yield collectibles",
  platform: null, // Search all platforms
  limit: 10,
  minScore: 0.7
}

// Test different asset platforms
{
  platform: "masterworks", 
  assetId: "PICASSO-042"
}

// Test error scenarios
{
  platform: "invalid_platform",
  assetId: "DOES-NOT-EXIST"
}
```

### Manual MCP Client Testing

If you have an MCP client (like Claude Desktop or MCP Inspector):

1. **Server URL**: `http://localhost:3000/mcp` or `http://localhost:3000/sse`
2. **Authentication**: Bearer token (any value works for testing)
3. **Available Tools**: All 6 tools are automatically registered

### Testing with Claude Desktop

1. Add to your Claude Desktop MCP config:
```json
{
  "servers": {
    "luxbridge": {
      "command": "node",
      "args": ["path/to/your/server.js"],
      "env": {}
    }
  }
}
```

2. Restart Claude Desktop
3. Use natural language to test tools:
   - "What's my portfolio performance?"
   - "Search for luxury wine investments"
   - "Tokenize the Monet Water Lilies asset"
   - "Show me my authentication status"

## 🎯 What to Test

### Core Functionality
- ✅ Authentication state retrieval
- ✅ Asset details from all 3 platforms
- ✅ Portfolio aggregation across platforms
- ✅ Semantic search with various queries
- ✅ Blockchain tokenization flow
- ✅ Token swapping with AMM simulation

### Edge Cases
- ✅ Invalid asset IDs
- ✅ Platform filtering
- ✅ Slippage protection in swaps
- ✅ No search results handling
- ✅ Different risk/yield preferences

### Data Quality
- ✅ Realistic asset prices and yields
- ✅ Proper platform categorization
- ✅ Blockchain transaction simulation
- ✅ Portfolio performance calculations
- ✅ Risk analysis and recommendations

## 🐛 Troubleshooting

### Common Issues

1. **TypeScript Errors**: Run `npm run typecheck` to verify
2. **Test Failures**: Check the test output for specific assertion failures
3. **Server Not Starting**: Ensure port 3000/3001 is available
4. **Missing Dependencies**: Run `npm install`

### Debug Mode

Add console logging to any tool to see detailed execution:

```typescript
console.log('Tool called with params:', params);
console.log('Mock response:', mockResponse);
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

- ✅ All 6 tests passing
- ✅ Realistic financial data in responses  
- ✅ Proper error handling for edge cases
- ✅ Consistent data across related tools
- ✅ Professional formatting and insights

The mock implementation now provides comprehensive, realistic responses that demonstrate the full potential of the LuxBridge AI platform for real-world asset investment and management.