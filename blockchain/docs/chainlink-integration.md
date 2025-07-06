# Chainlink Functions Integration Guide

## Overview

LuxBridge AI uses Chainlink Functions to fetch real-time pricing data from multiple RWA platforms, enabling accurate cross-platform valuations and arbitrage detection.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Smart Contract │────▶│ Chainlink Router │────▶│ Decentralized   │
│  (Oracle)       │     │                  │     │ Oracle Network  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                   ┌───────────────┐
                                                   │ External APIs │
                                                   ├───────────────┤
                                                   │ Splint Invest │
                                                   │ Masterworks   │
                                                   │ RealT         │
                                                   └───────────────┘
```

## Setup Instructions

### 1. Prerequisites

- Chainlink Functions subscription
- LINK tokens for funding
- Deployed oracle contract

### 2. Network Support

Currently supported networks:

- **Sepolia**: For testing
- **Polygon Mumbai**: For testing
- **Polygon Mainnet**: Production (planned)

### 3. Deployment Steps

```bash
# 1. Deploy oracle contract
npx hardhat run scripts/deploy/03-deploy-oracle.ts --network sepolia

# 2. Set up Chainlink Functions
npx hardhat run scripts/chainlink/setup-functions.ts --network sepolia

# 3. Fund with LINK tokens
# Send LINK to the subscription address shown in console
```

### 4. Configuration

The oracle requires:

- **Router Address**: Chainlink Functions router
- **Subscription ID**: Your funded subscription
- **DON ID**: Decentralized Oracle Network identifier

```solidity
oracle.setChainlinkConfig(
    0xb83E47C2bC239B3bf370bc41e1459A34b41238D0, // Sepolia router
    123, // Your subscription ID
    0x66756e2d706f6c79676f6e2d6d756d6261692d31 // DON ID
);
```

## JavaScript Source Code

The oracle executes JavaScript code in the Chainlink Functions environment:

```javascript
// Fetch asset data from multiple platforms
const assetId = args[0];
const platforms = args.slice(1);

const requests = platforms.map((platform) => {
  const url = `https://api.luxbridge.ai/${platform}/assets/${assetId}`;
  return Functions.makeHttpRequest({
    url: url,
    headers: { "Content-Type": "application/json" },
  });
});

const responses = await Promise.all(requests);
const prices = responses.map((res) => res.data.valuation);

// Calculate weighted average or detect arbitrage
const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
return Functions.encodeUint256(Math.floor(avgPrice * 1e18));
```

## API Integration

### Platform Endpoints

Each platform must expose a standardized API:

```
GET /api/assets/{assetId}

Response:
{
    "assetId": "WINE-001",
    "name": "Château Margaux 2019",
    "valuation": 125000,
    "currency": "USD",
    "lastUpdated": "2024-01-15T10:00:00Z"
}
```

### Error Handling

The oracle handles various failure scenarios:

- API timeouts (30s limit)
- Invalid responses
- Network failures
- Rate limiting

## Gas Optimization

### Cost Breakdown

- Request initiation: ~150k gas
- Callback fulfillment: ~100k gas
- LINK payment: 0.2 LINK per request

### Optimization Strategies

1. **Batch Requests**: Update multiple assets in one call
2. **Caching**: Store prices with expiry timestamps
3. **Selective Updates**: Only update stale prices

## Security Considerations

### Access Control

```solidity
modifier onlyAuthorized() {
    require(
        msg.sender == owner ||
        msg.sender == address(this) ||
        msg.sender == router,
        "Unauthorized"
    );
    _;
}
```

### Data Validation

- Verify price ranges (prevent manipulation)
- Check timestamp freshness
- Validate platform responses

### Rate Limiting

- Maximum requests per block
- Daily request limits
- Subscription balance monitoring

## Testing

### Local Testing

For local development, use mock implementation:

```solidity
function mockRequestCrossPlatformPrices(
    string calldata assetId,
    string[] calldata platforms
) external {
    // Simulate price updates
    uint256 mockPrice = 100000 * 1e18; // $100k
    prices[keccak256(abi.encodePacked(platforms[0], assetId))] = PriceData({
        price: mockPrice,
        timestamp: block.timestamp
    });
}
```

### Testnet Testing

1. Deploy to Sepolia
2. Fund subscription with test LINK
3. Execute test requests
4. Monitor fulfillment

### Integration Tests

```typescript
it("Should fetch cross-platform prices", async function () {
  const tx = await oracle.requestCrossPlatformPrices("WINE-001", [
    "splint_invest",
    "masterworks",
  ]);

  const receipt = await tx.wait();
  const requestId = receipt.events[0].args.requestId;

  // Wait for fulfillment (simulate in tests)
  await oracle.mockFulfillRequest(requestId, ethers.parseEther("125"));

  const price = await oracle.getPrice("splint_invest", "WINE-001");
  expect(price).to.equal(ethers.parseEther("125"));
});
```

## Monitoring

### Events to Track

```solidity
event PriceRequested(bytes32 requestId, string platform, string assetId);
event PriceUpdated(string platform, string assetId, uint256 price);
event RequestFailed(bytes32 requestId, bytes error);
```

### Metrics

- Request success rate
- Average response time
- LINK consumption
- Price deviation alerts

## Troubleshooting

### Common Issues

1. **Insufficient LINK**: Fund subscription
2. **Request Timeout**: Check API availability
3. **Invalid Response**: Verify API format
4. **Gas Limit**: Increase callback gas limit

### Debug Commands

```bash
# Check subscription balance
npx hardhat run scripts/chainlink/check-subscription.ts --network sepolia

# View recent requests
npx hardhat run scripts/chainlink/view-requests.ts --network sepolia

# Manual price update (testing)
npx hardhat run scripts/chainlink/manual-update.ts --network sepolia
```

## Cost Analysis

### Per Request

- Gas: ~250k @ 50 gwei = 0.0125 ETH
- LINK: 0.2 LINK @ $15 = $3
- Total: ~$3.50 per cross-platform price update

### Monthly Estimates

- 100 assets × 4 updates/day × 30 days = 12,000 requests
- Cost: 12,000 × $3.50 = $42,000/month

### Optimization

- Reduce update frequency for stable assets
- Implement change thresholds (only update if >1% change)
- Use keeper pattern for efficient batch updates

## Future Enhancements

1. **Multi-chain Oracle**: Deploy on multiple chains
2. **Consensus Mechanism**: Multiple node operators
3. **Historical Data**: Store price history on IPFS
4. **Advanced Analytics**: Calculate volatility, trends
5. **WebAssembly Functions**: More complex computations
