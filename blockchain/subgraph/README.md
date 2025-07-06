# LuxBridge AI Subgraph

This subgraph indexes all on-chain events for the LuxBridge AI RWA trading platform.

## Indexed Entities

- **Platform** - Registered RWA platforms
- **Asset** - Tokenized real-world assets
- **Pool** - AMM liquidity pools
- **Trade** - Token swap transactions
- **Arbitrage** - Cross-platform arbitrage opportunities
- **AutomatedTrade** - AI-executed trades
- **Delegation** - Trading permission delegations

## Local Development

### Prerequisites

1. Install Graph CLI:

```bash
npm install -g @graphprotocol/graph-cli
```

2. Start local Graph node:

```bash
cd blockchain
docker-compose up -d
```

### Deployment

1. Install dependencies:

```bash
cd blockchain/subgraph
npm install
```

2. Deploy contracts first:

```bash
cd blockchain
npx hardhat run scripts/deploy/04-deploy-full-system.ts --network localhost
```

3. Deploy subgraph:

```bash
cd blockchain
npx hardhat run scripts/deploy-subgraph.ts
```

### Querying

GraphQL endpoint: `http://localhost:8020/subgraphs/name/luxbridge-ai/rwa-trading`

Example queries in `test-queries.graphql`

## Production Deployment

For mainnet deployment:

1. Update `subgraph.yaml` with mainnet contract addresses
2. Deploy to The Graph's hosted service:

```bash
graph deploy --product hosted-service luxbridge-ai/rwa-trading
```

## Useful Queries

### Get all tokenized assets

```graphql
{
  assets(first: 100) {
    id
    assetId
    platform {
      name
    }
    totalSupply
    currentValuation
    lastUpdated
  }
}
```

### Recent trades

```graphql
{
  trades(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    from
    to
    tokenIn
    tokenOut
    amountIn
    amountOut
    timestamp
  }
}
```

### Active liquidity pools

```graphql
{
  pools(where: { totalLiquidity_gt: "0" }) {
    id
    token0
    token1
    reserve0
    reserve1
    totalLiquidity
    feeRate
  }
}
```
