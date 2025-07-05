# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js MCP (Model Context Protocol) server implementation with comprehensive authentication system. Features **dual-layer authentication**: OAuth 2.1 with Privy for LuxBridge access + Redis-backed platform authentication for RWA platforms (Splint Invest, Masterworks, RealT). Uses `@vercel/mcp-adapter` to create secure MCP endpoints that require valid OAuth access tokens for all requests. Supports both SSE and Streamable HTTP transport protocols.

**Authentication Architecture**:

- **Primary Layer**: OAuth 2.1 + Privy for LuxBridge user authentication
- **Platform Layer**: Redis-backed user registration/login for individual RWA platforms
- **Multi-Platform Bridge**: OAuth tokens now include sessionId to enable simultaneous connections to multiple platforms
- **Security**: bcrypt password hashing, JWT tokens, comprehensive session management with platform link tracking

**Blockchain Integration**: Includes a complete smart contract infrastructure for Real-World Asset (RWA) tokenization and cross-platform trading. The blockchain layer enables universal liquidity aggregation across mock RWA platforms through sophisticated AMMs and AI-powered automation using ETH-based settlements.

**Current State**: Production-ready multi-platform authentication system with simultaneous platform connectivity, cross-platform portfolio aggregation, Redis-backed storage, and smart contracts optimized for Zircuit network.

## Development Commands

- `npm install` - Install dependencies (use npm as specified)
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI interface
- `npm run typecheck` - Run TypeScript type checking (always run before commit)
- `npm run format` - Format code with Prettier (always before commit)
- `npm run format:check` - Check code formatting

**Blockchain Commands:**

- `npm run blockchain:compile` - Compile smart contracts
- `npm run blockchain:test` - Run blockchain tests
- `npm run blockchain:node` - Start local Hardhat network
- `npm run blockchain:deploy` - Deploy contracts to localhost

**Pre-commit checklist:**

1. Run `npm run typecheck` and fix any errors
2. Run `npm run format` and fix formatting
3. For blockchain changes: Run `npm run blockchain:compile` and fix any compilation errors

**Pre-push checklist:**

1. Run `npm run test:run` and ensure all tests pass
2. For blockchain changes: Run `npm run blockchain:test` and ensure all tests pass
3. Run `npm run build` to fix any build errors

## Environment Variables

Required for Redis (SSE transport):

```
REDIS_URL=redis://... (required for SSE on Vercel)
```

Optional for OAuth base URL:

```
NEXTAUTH_URL=https://your-domain.com (defaults to current request URL)
```

Use `vercel env pull .env.development.local` to sync from Vercel dashboard.

Optional for blockchain deployment:

```
# Network RPC URLs
ZIRCUIT_RPC_URL=https://zircuit1.p2pify.com
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID

# Private key for deployment (use default Hardhat accounts for local)
PRIVATE_KEY=0x...

# API keys for contract verification
ZIRCUIT_API_KEY=...
ETHERSCAN_API_KEY=...
```

## Architecture

### MCP Request Flow

1. **Client Request** → `/sse` or `/mcp` endpoint with Bearer token
2. **Authentication Layer** → Validates token via Redis-stored OAuth access tokens
3. **MCP Handler** (`createMcpHandler`) → Routes to appropriate tool
4. **Tool Execution** → Has access to authenticated user data and blockchain interaction
5. **Blockchain Integration** → MCP tools can interact with smart contracts via ethers.js
6. **Response** → Returns tool results or 401 if unauthorized

### Core Components

**MCP Server** (`app/[transport]/route.ts`):

- Dynamic route supports both `/sse` and `/mcp` transports
- Custom authentication via `authenticateRequest()` function
- Uses Redis-based OAuth access tokens for validation
- Configuration: `maxDuration: 60`, `verboseLogs: true`

**Dual Authentication System**:

**1. LuxBridge OAuth 2.1** (`lib/auth/token-verifier.ts`, `lib/redis-oauth.ts`):

- Privy-based authentication for main LuxBridge access
- PKCE-compliant OAuth 2.1 flow with Redis state management
- JWT tokens for MCP server access
- Discovery endpoints for OAuth server metadata

**2. Platform Authentication** (`lib/auth/redis-users.ts`, `lib/auth/authCommon.ts`):

- Redis-backed user registration and authentication for RWA platforms
- bcrypt password hashing with 12 salt rounds
- Individual platform credentials (Splint Invest, Masterworks, RealT)
- Portfolio management with empty portfolios for new users

**OAuth 2.1 Implementation**:

- **Authorization Flow** (`app/oauth/authorize/page.tsx`): Privy email-based OAuth UI
- **Platform Auth Flow** (`app/oauth/[platform]/authorize/page.tsx`): Platform-specific login
- **Registration Flow** (`app/oauth/[platform]/register/page.tsx`): New user registration
- **Token Exchange** (`app/api/oauth/token/route.ts`): PKCE-compliant token endpoint
- **Client Registration** (`app/api/oauth/register/route.ts`): Dynamic client registration
- **Discovery Endpoints** (`app/.well-known/oauth-*`): OAuth server and resource metadata
- **State Management** (`lib/redis-oauth.ts`): Complete OAuth state handling in Redis

### Transport Protocols

**SSE (Server-Sent Events)** - `/sse`:

- Persistent connections for real-time communication
- Requires Redis for state management (`lib/redis.ts`)

**Streamable HTTP** - `/mcp`:

- Stateless request/response protocol
- No Redis required for operation

### Redis Data Management

**OAuth State Schema** (`lib/redis-oauth.ts`):

- **Clients**: `oauth:client:{clientId}` - OAuth client configurations
- **Auth Codes**: `oauth:auth_code:{code}` - Temporary authorization codes (10min TTL)
- **Access Tokens**: `oauth:access_token:{token}` - Long-lived access tokens (24hr TTL) with sessionId for platform linking

**User Authentication Schema** (`lib/auth/redis-users.ts`):

- **Users**: `user:{email}` - Complete user profiles with portfolios
- **User ID Index**: `user_id:{userId}` → email - Quick userId lookup
- **Portfolio Data**: Embedded in user object with platform-specific holdings

**Session Management Schema** (`lib/auth/session-manager.ts`):

- **Sessions**: `session:{sessionId}` - Multi-platform authentication sessions (24hr TTL)
- **User Sessions**: `user_sessions:{luxUserId}` - Active session tracking per user
- **Platform Links**: Embedded in session object for real-time platform connectivity

**Redis User Structure**:

```json
{
  "userId": "user_1234567890_abc123",
  "email": "user@example.com",
  "passwordHash": "$2b$12$...",
  "name": "User Name",
  "scenario": "empty_portfolio",
  "portfolios": {
    "splint_invest": [],
    "masterworks": [],
    "realt": []
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Key Functions**:

**OAuth Management**:

- `storeClient()` / `getClient()` - Client management
- `storeAuthCode()` / `getAuthCode()` - Authorization code lifecycle
- `generateAccessToken()` / `storeAccessToken()` / `getAccessToken()` - Token management with sessionId support

**User Management**:

- `createUser()` / `getUserByEmail()` / `getUserById()` - User CRUD operations
- `validateCredentials()` / `registerUser()` - Authentication operations
- `addAssetToPortfolio()` / `removeAssetFromPortfolio()` - Portfolio management
- `updatePortfolioAsset()` / `getUserPortfolio()` - Portfolio operations

**Session Management** (`lib/auth/session-manager.ts`):

- `createAuthSession()` / `getAuthSession()` / `deleteAuthSession()` - Session lifecycle
- `getUserConnectedPlatforms()` - Multi-platform connectivity status
- `updateSessionPlatformLink()` - Real-time platform link management
- `getActiveUserSession()` - Current session retrieval

**Platform Authentication** (`lib/auth/platform-auth.ts`):

- `validatePlatformCredentials()` - Platform-specific authentication
- `makeAuthenticatedPlatformCall()` - Cross-platform API calls with session context
- `getAllUserPlatformLinks()` - Multi-platform connectivity overview

### MCP Tool Pattern

```typescript
server.tool(
  "tool_name",
  "Tool description for MCP discovery",
  z.object({ param: z.string() }), // Zod schema (optional)
  async () => {
    return {
      content: [
        {
          type: "text",
          text: "Result",
        },
      ],
    };
  },
);
```

**Currently Implemented:**

- `get_auth_state`: Returns authenticated user information from access token
- `get_portfolio`: Aggregates portfolio data from all connected platforms automatically
- `search_assets`: Searches across all connected platforms with intelligent platform selection

## Authentication Flow Details

### LuxBridge OAuth 2.1 Flow

**Authorization Request**:

1. Client redirects to `/oauth/authorize` with OAuth parameters
2. User authenticates via Privy (email-based)
3. System generates authorization code and stores in Redis
4. Redirects back to client with authorization code

**Token Exchange**:

1. Client POSTs to `/api/oauth/token` with authorization code
2. Server validates code and PKCE challenge
3. Generates access token and stores in Redis
4. Returns access token to client

**MCP Authentication**:

1. Client includes `Authorization: Bearer {access_token}` header
2. MCP server validates token against Redis
3. Retrieves user info from stored access token data

### Platform Authentication Flow

**User Registration** (New Users):

1. User visits `/oauth/{platform}/register` (splint_invest, masterworks, realt)
2. Fills registration form (email, password, name)
3. System validates input and checks for existing users
4. Creates user with bcrypt-hashed password in Redis
5. Generates JWT token for immediate platform access
6. Returns access token for platform API usage

**User Login** (Existing Users):

1. User visits `/oauth/{platform}/authorize`
2. Enters platform credentials (email, password)
3. System validates against Redis user data
4. Generates JWT token on successful authentication
5. Returns access token for platform API operations

**Platform API Authentication**:

1. Client includes `Authorization: Bearer {platform_jwt}` header
2. Platform API validates JWT token
3. Extracts user information and platform context
4. Allows access to platform-specific resources and portfolio data

## Deployment

### Vercel Configuration

- Enable Fluid compute for efficient execution
- Set `maxDuration` to 800 for Pro/Enterprise accounts (currently 60)
- Attach Redis store for SSE transport and OAuth state

### Commands

```bash
vercel                   # Deploy preview
vercel --prod           # Deploy to production
vercel env pull         # Sync environment variables
vercel logs [url]       # View function logs
vercel inspect [url]    # Deployment details
```

## Adding New Tools

1. Add tool definition in `app/[transport]/route.ts` inside `createMcpHandler`
2. Use Zod for parameter validation (optional)
3. Access authenticated user via `accessToken` variable in scope
4. Return content in MCP format: `{ content: [{ type: "text", text: "..." }] }`

## Error Handling

- Missing/invalid token: Returns 401 Unauthorized
- Expired tokens: Automatically cleaned up by Redis TTL
- OAuth errors: Proper error responses with CORS headers
- Tool errors: Caught and returned as error content

## Code Principles

- Never write code comments unless something really needs explanation
- Never write redundant TypeScript types like function return types
- Remove unused variables instead of prefixing with `_`
- Always run `npm run typecheck` before committing
- Follow clean code patterns throughout
- Always follow conventional commit pattern when committing code
- Keep commit messages concise and never write commit descriptions (never mention claude code in commits)

## Development Rules

### Pre-Implementation Requirements

1. **Always run typecheck before implementing new features**: `npm run typecheck`
2. **Always run typecheck before running newly implemented tests**: Fix all TypeScript errors first
3. **Write tests before or alongside implementation**: Follow TDD practices
4. **Review existing patterns**: Check relevant CLAUDE.md files in subdirectories

### Testing Requirements

- Run `npm run typecheck` before running any new tests
- Ensure all tests pass before proceeding with new development
- Write comprehensive tests for all new functionality
- Test both success and error scenarios
- Mock all external dependencies properly

### Commit Requirements

- **Only commit working and tested code**: All tests must pass
- **Make small logical commits**: One feature/fix per commit
- **Run full validation before each commit**:
  1. `npm run typecheck` - Fix all TypeScript errors
  2. `npm run test:run` - Ensure all tests pass
  3. `npm run format` - Format code consistently
- **Never commit failing tests or broken code**
- **Include tests in the same commit as implementation**

### Directory-Specific Guidelines

- See `__tests__/CLAUDE.md` for testing guidelines and patterns
- See `app/api/CLAUDE.md` for API implementation standards
- See `lib/CLAUDE.md` for library and utility development rules
- See `blockchain/CLAUDE.md` for smart contract development guidelines
- Follow the specific conventions outlined in each subdirectory

## Dependencies

**Core:**

- `@vercel/mcp-adapter@0.8.2` - MCP server adapter
- `next@15.2.4` - Next.js framework
- `zod@3.24.2` - Schema validation

**Authentication & Storage:**

- `redis@4.7.0` - OAuth state management
- `@modelcontextprotocol/sdk@1.12.1` - MCP protocol implementation

**Blockchain:**

- `@chainlink/contracts@1.2.0` - Chainlink Functions integration
- `@openzeppelin/contracts@5.0.2` - Security and utility contracts
- `hardhat@2.22.0` - Smart contract development framework
- `ethers@6.4.0` - Ethereum library for contract interaction
- `@nomicfoundation/hardhat-toolbox@5.0.0` - Hardhat plugin suite

**Testing:**

- `vitest@3.2.4` - Test framework
- `@vitest/ui@3.2.4` - Test UI interface
- `chai@4.2.0` - Blockchain assertion library

**UI:**

- `@radix-ui/*` - UI component primitives
- `tailwindcss@3.4.17` - Styling
- `lucide-react@0.468.0` - Icons

## Development Rules

### Pre-Implementation Requirements

1. **Always run typecheck before implementing new features**: `npm run typecheck`
2. **Always run typecheck before running newly implemented tests**: Fix all TypeScript errors first
3. **Write tests before or alongside implementation**: Follow TDD practices
4. **Review existing patterns**: Check relevant CLAUDE.md files in subdirectories

### Testing Requirements

- Run `npm run typecheck` before running any new tests
- Ensure all tests pass before proceeding with new development
- Write comprehensive tests for all new functionality
- Mock all external dependencies properly

### Commit Requirements

- **Only commit working and tested code**: All tests must pass
- **Make small logical commits**: One feature/fix per commit
- **Run full validation before each commit**:
- **Include tests in the same commit as implementation**

### Directory-Specific Guidelines

- See `__tests__/CLAUDE.md` for testing guidelines and patterns
- See `app/api/CLAUDE.md` for API implementation standards
- See `lib/CLAUDE.md` for library and utility development rules
- `@radix-ui/*` - UI component primitives
- `tailwindcss@3.4.17` - Styling
- `lucide-react@0.468.0` - Icons
