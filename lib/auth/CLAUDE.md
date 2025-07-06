# Authentication System Documentation

This directory contains the complete authentication infrastructure for LuxBridge AI, implementing a **dual-layer authentication model** that supports both LuxBridge OAuth 2.1 and platform-specific user management.

## Authentication Architecture Overview

### Dual Authentication Model

**Layer 1: LuxBridge OAuth 2.1** (Primary Access)

- **Purpose**: Main application access and MCP server authentication
- **Provider**: Privy-based authentication with email verification
- **Storage**: Redis-based OAuth state management with sessionId bridging
- **Scope**: System-wide access, MCP tool execution, cross-platform operations

**Layer 2: Platform Authentication** (RWA Platform Access)

- **Purpose**: Individual platform credentials for RWA platforms
- **Storage**: Redis-backed user profiles with bcrypt password hashing
- **Scope**: Platform-specific API access, portfolio management, asset operations
- **Platforms**: Splint Invest, Masterworks, RealT

**Multi-Platform Bridge** (Session Management)

- **Purpose**: Enable simultaneous connections to multiple RWA platforms
- **Implementation**: OAuth tokens include sessionId that links to platform authentication sessions
- **Features**: Real-time platform connectivity, cross-platform data aggregation, unified portfolio views

**Session-Based Authentication Flow** (Primary Platform Linking)

- **Purpose**: Seamless platform authentication within active MCP sessions
- **Entry Point**: `/auth/{platform}?session={sessionId}` - Session-preserving authentication pages
- **Registration Flow**: Integrated "Register here" navigation with session preservation
- **Auto-Return**: Registration automatically redirects back to auth page with session intact
- **Context Preservation**: No loss of OAuth context during registration flow

## File Structure

```
lib/auth/
├── authCommon.ts           # Unified authentication interface
├── redis-users.ts          # Redis-backed user management
├── platform-auth.ts       # Cross-platform session management
├── token-verifier.ts       # Privy-based token verification
├── session-manager.ts      # OAuth session handling
├── jwtUtils.ts            # JWT token utilities
├── authenticate-request.ts # Request authentication middleware
└── CLAUDE.md              # This documentation
```

## Core Authentication Components

### 1. Unified Authentication Interface (`authCommon.ts`)

**Purpose**: Provides backward-compatible authentication interface that delegates to Redis-backed system

**Key Functions**:

```typescript
// User authentication
validateCredentials(email: string, password: string): Promise<AuthResult>
getUserById(userId: string): Promise<User | undefined>
registerUser(params: CreateUserParams): Promise<AuthResult>

// Token operations
authenticateToken(authHeader?: string): TokenPayload | null
```

**Migration Pattern**:

- Maintains existing function signatures for backward compatibility
- Converts between legacy `User` type and new `RedisUser` type
- Strips password fields from responses for security

### 2. Redis User Management (`redis-users.ts`)

**Purpose**: Complete user lifecycle management with Redis persistence

**User Data Model**:

```typescript
interface RedisUser {
  userId: string; // Generated unique identifier
  email: string; // Primary key and login identifier
  passwordHash: string; // bcrypt hash with 12 salt rounds
  name: string; // Display name
  scenario: string; // User type (e.g., "empty_portfolio")
  portfolios: {
    // Platform-specific asset holdings
    splint_invest: UserPortfolioHolding[];
    masterworks: UserPortfolioHolding[];
    realt: UserPortfolioHolding[];
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

**Core Operations**:

```typescript
// User lifecycle
createUser(params: CreateUserParams): Promise<RedisUser>
getUserByEmail(email: string): Promise<RedisUser | null>
getUserById(userId: string): Promise<RedisUser | null>
validateCredentials(email: string, password: string): Promise<RedisUserAuthResult>
updateUser(userId: string, updates: UpdateUserParams): Promise<RedisUser | null>
deleteUser(userId: string): Promise<boolean>
getAllUsers(): Promise<RedisUser[]>

// Portfolio management
addAssetToPortfolio(userId: string, platform: PlatformType, asset: UserPortfolioHolding): Promise<RedisUser | null>
removeAssetFromPortfolio(userId: string, platform: PlatformType, assetId: string): Promise<RedisUser | null>
updatePortfolioAsset(userId: string, platform: PlatformType, assetId: string, updates: Partial<UserPortfolioHolding>): Promise<RedisUser | null>
getUserPortfolio(userId: string, platform?: PlatformType): Promise<UserPortfolioHolding[] | Record<PlatformType, UserPortfolioHolding[]> | null>

// Registration
registerUser(params: CreateUserParams): Promise<RedisUserAuthResult>
```

**Security Features**:

- **Password Hashing**: bcrypt with 12 salt rounds
- **Email Validation**: Duplicate checking and format validation
- **Data Integrity**: Atomic Redis operations with error handling
- **User Lookup**: Dual indexing (email and userId) for performance

### 3. Session Management (`session-manager.ts`)

**Purpose**: OAuth session lifecycle with multi-platform connectivity bridge

**Key Functions**:

```typescript
// Session lifecycle
createAuthSession(luxUserId: string, privyToken: string): Promise<string>
getAuthSession(sessionId: string): Promise<AuthSession | null>
deleteAuthSession(sessionId: string): Promise<void>
extendSession(sessionId: string): Promise<void>

// Multi-platform bridge
getUserConnectedPlatforms(userId: string, sessionId?: string): Promise<Record<PlatformType, PlatformLink | null>>
getActiveUserSession(userId: string): Promise<AuthSession | null>
updateSessionPlatformLink(sessionId: string, platform: PlatformType, platformLink: PlatformLink): Promise<void>

// User management
storeLuxBridgeUser(user: LuxBridgeUser): Promise<void>
getLuxBridgeUser(privyId: string): Promise<LuxBridgeUser | null>
```

**Session Data Model**:

```typescript
interface AuthSession {
  sessionId: string;
  luxUserId: string;
  privyToken: string;
  platforms: Record<PlatformType, PlatformLink | null>;
  createdAt: string;
  expiresAt: string;
}
```

### 4. Platform Authentication (`platform-auth.ts`)

**Purpose**: Cross-platform session management and platform linking

**Key Functions**:

```typescript
// Platform authentication
validatePlatformCredentials(platform: PlatformType, email: string, password: string): Promise<PlatformAuthResult>
storePlatformLink(linkData: Omit<PlatformLink, "linkedAt" | "lastUsedAt" | "status">): Promise<PlatformLink>
getPlatformLink(luxUserId: string, platform: PlatformType): Promise<PlatformLink | null>
deletePlatformLink(luxUserId: string, platform: PlatformType): Promise<void>

// Session management
makeAuthenticatedPlatformCall(sessionId: string, platform: PlatformType, endpoint: string, options?: RequestInit): Promise<any>
getAllUserPlatformLinks(luxUserId: string): Promise<PlatformLink[]>
validateAllPlatformLinks(luxUserId: string): Promise<void>
```

**Platform Configuration**:

```typescript
export const SUPPORTED_PLATFORMS = [
  {
    platform: "splint_invest" as PlatformType,
    name: "Splint Invest",
    description: "Wine and luxury asset investments",
    color: "from-purple-600 to-purple-800",
    category: "Alternative Assets",
  },
  {
    platform: "masterworks" as PlatformType,
    name: "Masterworks",
    description: "Contemporary art investments",
    color: "from-blue-600 to-blue-800",
    category: "Art & Collectibles",
  },
  {
    platform: "realt" as PlatformType,
    name: "RealT",
    description: "Tokenized real estate investments",
    color: "from-green-600 to-green-800",
    category: "Real Estate",
  },
] as const;
```

### 4. JWT Token Management (`jwtUtils.ts`)

**Purpose**: JWT token generation, validation, and Bearer token extraction

**Key Functions**:

```typescript
// Token operations
generateJWT(userId: string, platform: PlatformType): string
validateJWT(token: string): TokenPayload | null
extractBearerToken(authHeader?: string): string | null

// Token payload structure
interface TokenPayload {
  userId: string;
  platform: PlatformType;
  iat: number;      // Issued at
  exp: number;      // Expires at
}
```

**Token Configuration**:

- **Algorithm**: HS256 (HMAC SHA-256)
- **Expiration**: 24 hours (86400 seconds)
- **Claims**: userId, platform, standard JWT claims (iat, exp)
- **Secret**: Environment variable `JWT_SECRET`

### 5. OAuth Token Verification (`token-verifier.ts`)

**Purpose**: Privy-based token verification for LuxBridge OAuth 2.1

**Key Functions**:

```typescript
// Privy integration
tokenVerifier(bearerToken?: string): Promise<any>
privyVerifier(bearerToken?: string): Promise<PrivyAuthResult>
```

**Integration Features**:

- Privy JWT token validation
- User data extraction from Privy tokens
- Fallback to mock verification for development
- Error handling and token validation

## Redis Data Schema

### Authentication Keys

**OAuth State Management**:

```
oauth:client:{clientId}      → OAuth client configuration
oauth:auth_code:{code}       → Temporary authorization codes (10min TTL)
oauth:access_token:{token}   → Access tokens for MCP (24hr TTL)
```

**User Authentication**:

```
user:{email}                 → Complete user profile with portfolios
user_id:{userId}            → Fast userId → email lookup
```

**Platform Linking**:

```
platform_link:{luxUserId}:{platform} → Platform authentication links (24hr TTL)
```

### Data Persistence Patterns

**User Creation**:

```typescript
// 1. Create user record
await redis.hSet(`user:${email}`, userHashData);

// 2. Create userId index
await redis.set(`user_id:${userId}`, email);
```

**Portfolio Management**:

```typescript
// 1. Retrieve user
const user = await getUserById(userId);

// 2. Update portfolio data
user.portfolios[platform].push(newAsset);

// 3. Persist changes
await redis.hSet(`user:${user.email}`, {
  portfolios: JSON.stringify(user.portfolios),
  updatedAt: new Date().toISOString(),
});
```

## Security Implementation

### Password Security

**Hashing Strategy**:

```typescript
import bcrypt from "bcryptjs";

// Password hashing (registration)
const passwordHash = await bcrypt.hash(password, 12); // 12 salt rounds

// Password verification (login)
const isValid = await bcrypt.compare(password, user.passwordHash);
```

**Security Features**:

- **Salt Rounds**: 12 rounds for strong protection against rainbow table attacks
- **Never Store Plaintext**: Passwords immediately hashed upon registration
- **Secure Comparison**: Constant-time comparison to prevent timing attacks
- **Password Stripping**: Password fields removed from all API responses

### Token Security

**JWT Configuration**:

```typescript
// Token generation
const token = jwt.sign({ userId, platform }, process.env.JWT_SECRET!, {
  expiresIn: "24h",
});

// Token validation
const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
```

**Security Features**:

- **Strong Secret**: Environment-based JWT secret
- **Expiration**: 24-hour token lifetime
- **Platform Binding**: Tokens tied to specific platforms
- **Signature Verification**: HMAC SHA-256 signature validation

### Redis Security

**Connection Security**:

- TLS encryption for Redis connections
- Authentication via Redis URL
- Connection pooling for performance

**Data Protection**:

- TTL management for temporary data
- Atomic operations for data consistency
- Error handling for connection failures

## Development Patterns

### Session-Based Authentication Implementation

**Page Structure for Session-Preserving Auth**:

```typescript
// app/auth/[platform]/page.tsx
export default function PlatformAuthPage({ params }: AuthPageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  // Validate session presence
  if (!sessionId) {
    return <InvalidSessionError />;
  }

  // Include register navigation with session preservation
  return (
    <PlatformAuthForm 
      platform={platform} 
      sessionId={sessionId}
      onRegisterClick={() => 
        router.push(`/auth/${platform}/register?session=${sessionId}`)
      }
    />
  );
}

// app/auth/[platform]/register/page.tsx 
export default function PlatformRegisterPage({ params }: RegisterPageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  // Auto-redirect back to auth page after successful registration
  const handleRegistrationSuccess = () => {
    router.push(`/auth/${platform}?session=${sessionId}`);
  };

  return (
    <PlatformRegisterForm 
      platform={platform}
      sessionId={sessionId}
      onSuccess={handleRegistrationSuccess}
    />
  );
}
```

**Session Parameter Management**:

```typescript
// Always preserve session ID in navigation
const navigateWithSession = (path: string, sessionId: string) => {
  const url = new URL(path, window.location.origin);
  url.searchParams.set('session', sessionId);
  router.push(url.toString());
};

// Example usage in register link
<Button onClick={() => navigateWithSession(`/auth/${platform}/register`, sessionId)}>
  Register here
</Button>
```

**Form Integration Patterns**:

```typescript
// Registration form with auto-return
const handleRegistrationSubmit = async (formData: RegistrationData) => {
  const response = await fetch(`/api/${platform}/auth/register`, {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  
  if (response.ok) {
    // Success: redirect back to auth page with session
    router.push(`/auth/${platform}?session=${sessionId}`);
  }
};

// Auth form with register navigation
const handleRegisterNavigation = () => {
  router.push(`/auth/${platform}/register?session=${sessionId}`);
};
```

### Adding New Authentication Methods

**1. Extend User Types**:

```typescript
// lib/types/redis-user.ts
interface RedisUser {
  // ... existing fields
  newAuthMethod?: {
    provider: string;
    externalId: string;
    metadata?: Record<string, any>;
  };
}
```

**2. Add Authentication Function**:

```typescript
// lib/auth/redis-users.ts
export async function authenticateWithProvider(
  provider: string,
  credentials: any,
): Promise<RedisUserAuthResult> {
  // Implementation
}
```

**3. Update Common Interface**:

```typescript
// lib/auth/authCommon.ts
export async function validateProviderCredentials(
  provider: string,
  credentials: any,
): Promise<AuthResult> {
  // Delegate to Redis implementation
}
```

### Adding New Platforms

**1. Update Platform Types**:

```typescript
// lib/types/platformAsset.ts
export type PlatformType =
  | "splint_invest"
  | "masterworks"
  | "realt"
  | "new_platform";
```

**2. Add Platform Configuration**:

```typescript
// lib/auth/platform-auth.ts
export const SUPPORTED_PLATFORMS = [
  // ... existing platforms
  {
    platform: "new_platform" as PlatformType,
    name: "New Platform",
    description: "Platform description",
    color: "from-red-600 to-red-800",
    category: "New Category",
  },
] as const;
```

**3. Update User Schema**:

```typescript
// lib/types/redis-user.ts
interface RedisUser {
  portfolios: {
    splint_invest: UserPortfolioHolding[];
    masterworks: UserPortfolioHolding[];
    realt: UserPortfolioHolding[];
    new_platform: UserPortfolioHolding[]; // Add new platform
  };
}
```

## Testing Patterns

### Unit Testing

**Mock Redis Operations**:

```typescript
// __tests__/setup.ts
vi.mock("@/lib/auth/redis-users", () => ({
  validateCredentials: vi.fn(),
  getUserById: vi.fn(),
  registerUser: vi.fn(),
  // ... other functions
}));
```

**Test Authentication Functions**:

```typescript
describe("validateCredentials", () => {
  it("should validate correct credentials", async () => {
    vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
      success: true,
      user: mockRedisUser,
    });

    const result = await validateCredentials("test@example.com", "password123");

    expect(result.success).toBe(true);
    expect(result.user?.password).toBe(""); // Password stripped for security
  });
});
```

### Integration Testing

**API Endpoint Testing**:

```typescript
describe("POST /api/platform/auth/register", () => {
  it("should register new user successfully", async () => {
    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });

    const response = await POST(request, mockContext);
    const data = await expectJSONResponse(response, 200);

    expect(data.accessToken).toBeDefined();
    expect(data.userId).toBeDefined();
  });
});
```

## Performance Considerations

### Redis Optimization

**Connection Management**:

```typescript
// Ensure connection before operations
async function ensureConnected() {
  if (!redis.isReady) {
    await redis.connect();
  }
}
```

**Indexing Strategy**:

- **Email Index**: Primary key for user lookup
- **UserId Index**: Secondary index for fast userId → email resolution
- **Platform Linking**: Separate keys for cross-platform authentication

### Caching Strategy

**User Data Caching**:

- Redis serves as both primary storage and cache
- TTL management for temporary tokens
- Connection pooling for high-throughput scenarios

## Error Handling

### Authentication Errors

**Common Error Types**:

```typescript
// User not found
{ success: false, error: "Invalid credentials" }

// User already exists
{ success: false, error: "User already exists" }

// Network/Redis errors
{ success: false, error: "Network error" }
```

**Error Response Patterns**:

```typescript
// API error responses
{
  error: "error_code",        // Snake_case identifier
  message: "Human readable",  // User-friendly message
  details?: any[]            // Optional validation details
}
```

### Recovery Patterns

**Redis Connection Failures**:

```typescript
try {
  await redis.operation();
} catch (error) {
  console.error("Redis operation failed:", error);
  // Graceful degradation or retry logic
  return null;
}
```

## Migration Considerations

### From Static to Redis

**Data Migration Strategy**:

1. **Dual Mode**: Run both static and Redis systems in parallel
2. **User Migration**: Migrate users on first login
3. **Fallback**: Graceful fallback to static data if Redis unavailable
4. **Validation**: Compare results between systems during transition

### Backward Compatibility

**Interface Preservation**:

```typescript
// Maintain existing function signatures
export async function getUserById(userId: string): Promise<User | undefined> {
  const redisUser = await redisGetUserById(userId);
  return redisUser ? convertRedisUserToUser(redisUser) : undefined;
}
```

**Type Conversion**:

```typescript
function convertRedisUserToUser(redisUser: RedisUser): User {
  return {
    userId: redisUser.userId,
    email: redisUser.email,
    password: "", // Strip password for security
    name: redisUser.name,
    scenario: redisUser.scenario,
    portfolios: redisUser.portfolios,
  };
}
```

This authentication system provides a robust foundation for secure user management while maintaining flexibility for future enhancements and platform integrations.
