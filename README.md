# Example Next.js MCP Server

**Uses `@vercel/mcp-adapter`**


## Usage

This sample app uses the [Vercel MCP Adapter](https://www.npmjs.com/package/@vercel/mcp-adapter) that allows you to drop in an MCP server on a group of routes in any Next.js project.

Update `app/[transport]/route.ts` with your tools, prompts, and resources following the [MCP TypeScript SDK documentation](https://github.com/modelcontextprotocol/typescript-sdk/tree/main?tab=readme-ov-file#server).

## Notes for running on Vercel

- To use the SSE transport, requires a Redis attached to the project under `process.env.REDIS_URL`
- Make sure you have [Fluid compute](https://vercel.com/docs/functions/fluid-compute) enabled for efficient execution
- After enabling Fluid compute, open `app/route.ts` and adjust `maxDuration` to 800 if you using a Vercel Pro or Enterprise account
- [Deploy the Next.js MCP template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)

## Sample Client

`script/test-client.mjs` contains a sample client to try invocations.

```sh
node scripts/test-client.mjs https://mcp-for-next-js.vercel.app
```
# LuxBridge AI
**The Universal Liquidity Layer for Real-World Assets**
*Making $15.2B in fragmented RWA markets tradeable through AI-powered cross-platform aggregation*
---
## 🚀 The Vision
LuxBridge AI solves the **$15.2 billion liquidity fragmentation problem** in Real-World Asset markets by creating the first universal aggregation layer that enables AI models to facilitate seamless trading across isolated platforms like Splint Invest, Masterworks, and RealT.
**The Problem**: Your wine investment on Splint cannot interact with your art on Masterworks or real estate on RealT, creating portfolio silos and limiting liquidity.
**Our Solution**: AI-powered synthetic tokenization that bridges platforms, enabling natural language portfolio management and cross-platform asset swaps.
```
"Trade my $5,000 wine investment for contemporary art" 
→ AI automatically tokenizes, finds liquidity, executes swap, settles across platforms
```

## 🎯 Core Innovation

### **Synthetic Tokenization Layer**
- **Custody Proof System**: Cryptographic verification of asset backing
- **Cross-Platform Bridges**: Platform-specific integrations with unified interface

### **AI-Powered Orchestration**
- **Model Context Protocol Server**: Enable AI models to execute complex financial operations
- **Natural Language Trading**: Express investment intentions conversationally
- **Cross-Platform Intelligence**: AI enhances platform expertise without replacing specialist knowledge

### **Universal Liquidity Aggregation**
- **Intent-Based Trading**: Swap wine → art → real estate through single AI interaction
- **Automated Market Making**: Improve liquidity for traditionally illiquid assets
- **Cross-Platform Settlement**: Atomic transactions with cryptographic guarantees

## ⚡ Technical Architecture

### **MCP Server Foundation**
```typescript
// AI models can execute sophisticated financial operations through standardized tools
// Cross-platform asset tokenization, liquidity aggregation, and settlement
// Natural language interface for complex investment strategies
```

### **Privy Authentication Integration**
- Embedded wallet creation during authentication flow
- OAuth 2.1 with PKCE for secure token-based access
- Support for SSE and HTTP transport protocols
- Seamless Web2 to Web3 onboarding experience

## 🚀 Quick Start

### **Using LuxBridge AI with Claude**
1. **Add MCP Integration**: Go to [claude.ai](https://claude.ai) and add LuxBridge AI MCP server:
   ```
   https://luxbridge-ai.vercel.app/mcp
   ```
2. **Authenticate**: Click the "Connect" button to authenticate with Privy and create your embedded wallet

3. **Start Trading**: Use natural language to manage your cross-platform RWA portfolio:
   ```
   "Show me my current portfolio across all platforms"
   "Trade my wine investment for contemporary art"
   "Find arbitrage opportunities between platforms"
   ```

### **Development Setup**

### **Prerequisites**
- Node.js 18+
- Redis instance (required for SSE transport)
- Git

### **Installation**

```bash
# Clone the repository
git clone https://github.com/jaksm/luxbridge-ai
cd luxbridge-ai

# Install dependencies (use npm as specified)
npm install

# Set up environment variables
# Add your Redis URL to .env.local: REDIS_URL=redis://...

# Start development server
npm run dev
```

## 📡 API Endpoints

### **MCP Transports**
- `GET /sse` - Server-Sent Events (persistent connections)
- `POST /mcp` - HTTP transport (stateless)

### **OAuth 2.1 Flow**
- `GET /oauth/authorize` - Authorization endpoint
- `POST /api/oauth/token` - Token exchange
- `POST /api/oauth/register` - Client registration

### **Discovery**
- `GET /.well-known/oauth-authorization-server` - OAuth metadata
- `GET /.well-known/resource-metadata` - Resource server info

## 🎭 Demo Scenarios

### **Scenario 1: Cross-Platform Portfolio Rebalancing**
```
User: "I want to reduce my wine exposure and increase contemporary art"

AI via LuxBridge:
1. Analyzes current portfolio across Splint + Masterworks
2. Identifies optimal rebalancing strategy
3. Tokenizes wine assets → Finds art liquidity → Executes swap
4. Settles transactions across both platforms
```

### **Scenario 2: AI-Enhanced Portfolio Insights**
```
User: "Should I buy more real estate given current market conditions?"

AI Response:
- Based on platform expert valuations: Real estate showing 12% YoY growth vs. 8% wine market
- Your portfolio composition: 45% wine, 30% art, 25% real estate
- Platform liquidity analysis: $15K RealT tokens available across 3 properties
- Recommendation: Consider rebalancing based on current market conditions
```

## 🔐 Security Features

### **Authentication & Authorization**
- OAuth 2.1 with PKCE (Proof Key for Code Exchange) via Privy
- JWT access tokens with configurable expiration
- Bearer token validation for all MCP requests
- Embedded wallet creation and management

### **Asset Custody**
- Mock cryptographic proof of custody system (for demonstration purposes)
- Designed for platform teams to implement our Asset schema and bridge standards in production
- On-chain verification patterns for asset backing
- Segregated custody concepts preventing double-spending

### **Account Security**
- Guardian-based account recovery via Privy
- Circuit breaker patterns for failed integrations

## 📊 Market Opportunity

### **RWA Market Size**
- **Current**: $15.2B tokenized (85% YoY growth)
- **Projected**: $18.9T by 2030
- **Problem**: 0.5% of DEX volume despite billions in assets

### **Platform Fragmentation**
- **Splint Invest**: €21M+ AUM, 15K+ investors, wine/art/collectibles
- **Masterworks**: $1B+ AUM, exclusive art market access
- **RealT**: 970+ tokenized properties, blockchain-native

### **Competitive Moat**
- First universal RWA liquidity aggregator
- AI-powered cross-platform intelligence that enhances (not replaces) platform expertise
- Compliance-first architecture for institutional adoption

## 🌐 Deployment

LuxBridge AI is deployed on Vercel with automatic scaling and Redis integration for production-ready performance.

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

**LuxBridge AI**: *Where Real-World Assets Meet Universal Liquidity*
