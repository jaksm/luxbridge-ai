# Library Implementation Guidelines

This directory contains core business logic and utilities for the LuxBridge AI Mock API system.

## Library Structure

### Authentication (`auth/`)

- **JWT Utilities**: Token generation, validation, and Bearer token extraction
- **Auth Common**: Credential validation and token authentication
- **User Management**: Static user store and lookup functions
- **Token Verification**: Mock token verification for development

### Storage (`storage/`)

- **Redis Client**: Asset storage, portfolio management, platform info
- **Pinecone Client**: Vector search, semantic asset discovery, embeddings

### Types (`types/`)

- **Platform Assets**: Core data structures for RWA assets
- **User Types**: Authentication and portfolio types
- **Schemas**: Zod validation schemas for API endpoints and MCP tools

### Utilities (`utils/`)

- **Portfolio Calculator**: Portfolio construction, metrics, risk analysis
- **Semantic Search**: Natural language asset discovery

## Development Rules

### Before Implementation

1. **Always run typecheck first**: `npm run typecheck`
2. Fix all TypeScript errors before proceeding
3. Write comprehensive tests for all business logic
4. Follow existing patterns and conventions

### Code Standards

#### Type Definitions

```typescript
// Always use explicit interfaces, never any
export interface PlatformAsset {
  assetId: string;
  platform: PlatformType;
  name: string;
  // ... explicit properties
}

// Use branded types for IDs where appropriate
export type UserId = string & { readonly __brand: unique symbol };
```

#### Error Handling

```typescript
// Always handle errors gracefully
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error("Operation failed:", error);
  return null; // or appropriate fallback
}
```

#### Async Operations

```typescript
// Use proper async/await patterns
export async function getAsset(
  params: GetAssetParams,
): Promise<PlatformAsset | null> {
  await ensureConnected();
  const key = `platform:${params.platform}:assets:${params.assetId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}
```

### Module-Specific Guidelines

#### Authentication (`auth/`)

- Use strong typing for all JWT operations
- Never log sensitive authentication data
- Implement proper token expiration handling
- Use secure random generation for tokens
- Follow OAuth 2.1 specifications exactly

```typescript
export function generateJWT(userId: string, platform: PlatformType): string {
  return jwt.sign({ userId, platform }, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });
}
```

#### Storage (`storage/`)

- Always ensure connections before operations
- Use proper connection pooling
- Implement graceful error handling
- Use consistent key naming patterns
- Handle Redis/Pinecone failures gracefully

```typescript
export class AssetStorage {
  async getAsset(params: GetAssetParams): Promise<PlatformAsset | null> {
    await ensureConnected();
    const key = `platform:${params.platform}:assets:${params.assetId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }
}
```

#### Types (`types/`)

- Use strict TypeScript configuration
- Define explicit interfaces for all data structures
- Use branded types for domain-specific IDs
- Implement Zod schemas for runtime validation
- Export both types and schemas

```typescript
export const GetAssetSchema = z
  .object({
    platform: z.enum(["splint_invest", "masterworks", "realt"]),
    assetId: z.string(),
  })
  .describe("Parameters for retrieving a specific asset");

export type GetAssetParams = z.infer<typeof GetAssetSchema>;
```

#### Utilities (`utils/`)

- Keep functions pure where possible
- Use proper error handling and validation
- Implement comprehensive business logic
- Follow functional programming principles
- Document complex calculations

```typescript
export function calculatePortfolioMetrics(
  holdings: UserPortfolioHolding[],
): PortfolioMetrics {
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const totalGain = holdings.reduce(
    (sum, holding) => sum + holding.unrealizedGain,
    0,
  );

  return {
    totalValue,
    totalGain,
    gainPercentage:
      totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0,
    // ... other metrics
  };
}
```

## Testing Requirements

### Unit Test Pattern

```typescript
describe("ModuleName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle valid input", async () => {
    const result = await functionUnderTest(validInput);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle invalid input", async () => {
    await expect(functionUnderTest(invalidInput)).rejects.toThrow();
  });

  it("should handle service failures", async () => {
    vi.mocked(externalService).mockRejectedValue(new Error("Service error"));
    const result = await functionUnderTest(validInput);
    expect(result).toBeNull();
  });
});
```

### Required Test Coverage

- ✅ All public functions and methods
- ✅ Error handling and edge cases
- ✅ Input validation and sanitization
- ✅ External service integration
- ✅ Complex business logic calculations

## Performance Guidelines

### Redis Operations

- Use pipeline operations for bulk data
- Implement proper connection pooling
- Use appropriate TTL for cached data
- Handle connection failures gracefully

### Pinecone Operations

- Batch embedding generation where possible
- Use proper indexing strategies
- Implement efficient filtering
- Handle rate limits appropriately

### Memory Management

- Avoid memory leaks in long-running operations
- Use streaming for large datasets
- Implement proper cleanup in error cases

## Security Guidelines

### Data Handling

- Never log sensitive user data
- Sanitize all inputs before storage
- Use proper encryption for sensitive fields
- Implement access controls

### Authentication

- Use secure JWT signing algorithms
- Implement proper token rotation
- Handle expired tokens gracefully
- Follow OAuth 2.1 security guidelines

## Commit Guidelines

### Before Committing Library Changes

1. `npm run typecheck` - Fix all TypeScript errors
2. `npm run test:run` - Ensure all tests pass
3. `npm run format` - Format code consistently
4. Verify no breaking changes to existing APIs

### Commit Message Format

```
feat: add portfolio risk calculation utilities
fix: handle Redis connection timeout in asset storage
refactor: improve type safety in JWT validation
test: add comprehensive portfolio calculator tests
```

### Breaking Changes

- Mark breaking changes clearly in commit messages
- Update all dependent code in same commit
- Provide migration path for API changes
- Update documentation and examples

## Environment Configuration

### Required Environment Variables

```bash
JWT_SECRET=your_jwt_secret_key
REDIS_URL=redis://localhost:6379
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=luxbridge-assets
OPENAI_API_KEY=your_openai_api_key
```

### Development vs Production

- Use different Redis instances for dev/prod
- Implement proper logging levels
- Use environment-specific configurations
- Handle missing environment variables gracefully

## Library Structure

### Authentication (`auth/`)

- **JWT Utilities**: Token generation, validation, and Bearer token extraction
- **Auth Common**: Credential validation and token authentication
- **User Management**: Static user store and lookup functions
- **Token Verification**: Mock token verification for development

### Storage (`storage/`)

- **Redis Client**: Asset storage, portfolio management, platform info
- **Pinecone Client**: Vector search, semantic asset discovery, embeddings

### Types (`types/`)

- **Platform Assets**: Core data structures for RWA assets
- **User Types**: Authentication and portfolio types
- **Schemas**: Zod validation schemas for API endpoints and MCP tools

### Utilities (`utils/`)

- **Portfolio Calculator**: Portfolio construction, metrics, risk analysis
- **Semantic Search**: Natural language asset discovery

## Development Rules

### Before Implementation

1. **Always run typecheck first**: `npm run typecheck`
2. Fix all TypeScript errors before proceeding
3. Write comprehensive tests for all business logic

### Code Standards

#### Type Definitions

```typescript
// Always use explicit interfaces, never any
export interface PlatformAsset {
```

#### Error Handling

```typescript
// Always handle errors gracefully
try {
```

#### Async Operations

````typescript
// Use proper async/await patterns
export async function getAsset(
  params: GetAssetParams,
): Promise<PlatformAsset | null> {
  await ensureConnected();
  const key = `platform:${params.platform}:assets:${params.assetId}`;
  const data = await redis.get(key);
### Module-Specific Guidelines
#### Authentication (`auth/`)

- Use strong typing for all JWT operations
- Never log sensitive authentication data
- Implement proper token expiration handling
```typescript
export function generateJWT(userId: string, platform: PlatformType): string {
  return jwt.sign({ userId, platform }, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });
}
````

#### Storage (`storage/`)

- Always ensure connections before operations
- Use proper connection pooling
- Implement graceful error handling

````
#### Types (`types/`)

- Use strict TypeScript configuration
- Define explicit interfaces for all data structures
- Use branded types for domain-specific IDs
- Export both types and schemas
```typescript
export const GetAssetSchema = z
  .object({
    platform: z.enum(["splint_invest", "masterworks", "realt"]),
    assetId: z.string(),
  })
  .describe("Parameters for retrieving a specific asset");
export type GetAssetParams = z.infer<typeof GetAssetSchema>;
````

#### Utilities (`utils/`)

- Keep functions pure where possible
- Use proper error handling and validation
- Implement comprehensive business logic

````typescript
export function calculatePortfolioMetrics(
  holdings: UserPortfolioHolding[],
): PortfolioMetrics {
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0,
  );
  const totalGain = holdings.reduce(
    (sum, holding) => sum + holding.unrealizedGain,
    0,
  );

  return {
    totalValue,
    totalGain,
    gainPercentage:
      totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0,
    // ... other metrics
  };
}
## Testing Requirements
### Unit Test Pattern

```typescript
describe("ModuleName", () => {
  beforeEach(() => {
````

### Required Test Coverage

- ✅ All public functions and methods
- ✅ Error handling and edge cases
- ✅ Input validation and sanitization

## Performance Guidelines

### Redis Operations

- Use pipeline operations for bulk data
- Implement proper connection pooling
- Use appropriate TTL for cached data
- Handle connection failures gracefully

### Pinecone Operations

- Batch embedding generation where possible
- Use proper indexing strategies
- Implement efficient filtering
- Handle rate limits appropriately

### Memory Management

- Avoid memory leaks in long-running operations
- Use streaming for large datasets
- Implement proper cleanup in error cases

## Security Guidelines

### Data Handling

- Never log sensitive user data
- Sanitize all inputs before storage
- Use proper encryption for sensitive fields
- Implement access controls

### Authentication

- Use secure JWT signing algorithms
- Implement proper token rotation
- Handle expired tokens gracefully

## Commit Guidelines

### Before Committing Library Changes

1. `npm run typecheck` - Fix all TypeScript errors
2. `npm run test:run` - Ensure all tests pass
3. `npm run format` - Format code consistently
4. Verify no breaking changes to existing APIs

### Commit Message Format

```
feat: add portfolio risk calculation utilities
fix: handle Redis connection timeout in asset storage
```

### Breaking Changes

- Mark breaking changes clearly in commit messages
- Update all dependent code in same commit
- Provide migration path for API changes

## Environment Configuration

### Required Environment Variables

```bash
JWT_SECRET=your_jwt_secret_key
REDIS_URL=redis://localhost:6379
```

### Development vs Production

- Use different Redis instances for dev/prod
- Implement proper logging levels
- Use environment-specific configurations
- Handle missing environment variables gracefully
