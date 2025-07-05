# Testing Guidelines

This directory contains comprehensive test suites for the LuxBridge AI Mock API system.

## Test Structure

### Core Infrastructure Tests

- `lib/storage/` - Redis client and Pinecone vector search tests
- `lib/auth/` - Authentication utilities and JWT handling tests
- `lib/utils/` - Portfolio calculation and utility function tests

### API Route Tests

- `app/api/[platform]/` - Platform-specific API endpoint tests
- `app/api/oauth/` - OAuth 2.1 flow and token management tests
- `app/api/cross-platform/` - Cross-platform analysis endpoint tests
- `app/[transport]/` - MCP transport handler tests

### Test Utilities

- `fixtures/` - Mock data for assets, users, and tokens
- `utils/` - Test helper functions and utilities
- `setup.ts` - Global test configuration and mocking

## Running Tests

**Always run typecheck before testing new implementations:**

```bash
npm run typecheck  # Fix any TypeScript errors first
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:ui    # Run tests with UI interface
```

## Test Requirements

### Before Implementation

1. Run `npm run typecheck` and fix all TypeScript errors
2. Ensure all existing tests pass
3. Write tests for new functionality before implementation (TDD)

### Test Standards

- Mock all external dependencies (Redis, Pinecone, OpenAI, JWT)
- Use realistic test data that matches production structures
- Test both success and error scenarios
- Include edge cases and validation failures
- Maintain 100% test coverage for critical paths

### Mock Configuration

All mocks are configured in `__tests__/setup.ts`:

- **Redis**: Mocked client with all operations
- **Redis Authentication**: Complete mock for `lib/auth/redis-users` module  
- **Pinecone**: Mocked vector search and upsert operations
- **OpenAI**: Mocked embedding generation
- **JWT**: Mocked token signing and verification
- **Fetch**: Enhanced response mocking with clone support

**Authentication System Mocks**:
```typescript
// Redis authentication module mock
vi.mock("@/lib/auth/redis-users", () => ({
  validateCredentials: vi.fn(),
  getUserById: vi.fn(),
  registerUser: vi.fn(),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  addAssetToPortfolio: vi.fn(),
  removeAssetFromPortfolio: vi.fn(),
  updatePortfolioAsset: vi.fn(),
  getUserPortfolio: vi.fn(),
  deleteUser: vi.fn(),
  getAllUsers: vi.fn(),
}));
```

### Test Data

Use fixtures from `__tests__/fixtures/`:

- `mockAssets.ts` - Platform asset data
- `mockUsers.ts` - User profiles and portfolios
- `mockTokens.ts` - JWT tokens and auth headers

### Common Patterns

#### API Route Testing

```typescript
import {
  createMockContext,
  expectJSONResponse,
} from "@/__tests__/utils/testHelpers";

const request = createMockRequest(body);
const context = createMockContext({ platform: "splint_invest" });
const response = await GET(request, context);
await expectJSONResponse(response, 200);
```

#### Mock Setup

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockFunction).mockResolvedValue(expectedResult);
});
```

#### Error Testing

```typescript
vi.mocked(mockFunction).mockRejectedValue(new Error("Expected error"));
await expect(functionUnderTest()).rejects.toThrow("Expected error");
```

## Authentication Testing Patterns

### Redis User Authentication Tests

**Mock Redis User Functions**:
```typescript
import { vi } from "vitest";
import * as redisUsers from "@/lib/auth/redis-users";

// Mock the entire module
vi.mock("@/lib/auth/redis-users", () => ({
  validateCredentials: vi.fn(),
  getUserById: vi.fn(),
  registerUser: vi.fn(),
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  updateUser: vi.fn(),
  addAssetToPortfolio: vi.fn(),
  removeAssetFromPortfolio: vi.fn(),
  updatePortfolioAsset: vi.fn(),
  getUserPortfolio: vi.fn(),
  deleteUser: vi.fn(),
  getAllUsers: vi.fn(),
}));
```

**Test Redis Authentication Functions**:
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

  it("should reject invalid credentials", async () => {
    vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const result = await validateCredentials("test@example.com", "wrongpass");
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid credentials");
  });
});
```

### Platform Authentication API Tests

**Registration Endpoint Tests**:
```typescript
describe("POST /api/[platform]/auth/register", () => {
  it("should register new user successfully", async () => {
    vi.mocked(redisUsers.registerUser).mockResolvedValue({
      success: true,
      user: mockRedisUser,
    });

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    const context = createMockContext({ platform: "splint_invest" });

    const response = await POST(request, context);
    const data = await expectJSONResponse(response, 200);

    expect(data.accessToken).toBeDefined();
    expect(data.userId).toBeDefined();
    expect(data.platform).toBe("splint_invest");
  });

  it("should handle duplicate email registration", async () => {
    vi.mocked(redisUsers.registerUser).mockResolvedValue({
      success: false,
      error: "User already exists",
    });

    const request = createMockRequest({
      email: "existing@example.com",
      password: "password123",
      name: "Test User",
    });
    const context = createMockContext({ platform: "splint_invest" });

    const response = await POST(request, context);
    await expectJSONResponse(response, 409);
  });
});
```

**Login Endpoint Tests**:
```typescript
describe("POST /api/[platform]/auth/login", () => {
  it("should authenticate valid credentials", async () => {
    vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
      success: true,
      user: mockRedisUser,
    });

    const request = createMockRequest({
      email: "test@example.com",
      password: "password123",
    });
    const context = createMockContext({ platform: "splint_invest" });

    const response = await POST(request, context);
    const data = await expectJSONResponse(response, 200);

    expect(data.accessToken).toBeDefined();
    expect(data.platform).toBe("splint_invest");
  });

  it("should reject invalid credentials", async () => {
    vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const request = createMockRequest({
      email: "test@example.com",
      password: "wrongpass",
    });
    const context = createMockContext({ platform: "splint_invest" });

    const response = await POST(request, context);
    await expectJSONResponse(response, 401);
  });
});
```

### JWT Token Testing

**Token Generation Tests**:
```typescript
describe("generateJWT", () => {
  it("should generate valid JWT token", () => {
    const token = generateJWT("user123", "splint_invest");
    
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    
    const payload = validateJWT(token);
    expect(payload?.userId).toBe("user123");
    expect(payload?.platform).toBe("splint_invest");
  });
});
```

**Token Validation Tests**:
```typescript
describe("validateJWT", () => {
  it("should validate correct token", () => {
    const token = generateJWT("user123", "splint_invest");
    const payload = validateJWT(token);
    
    expect(payload).toBeDefined();
    expect(payload?.userId).toBe("user123");
    expect(payload?.platform).toBe("splint_invest");
  });

  it("should reject invalid token", () => {
    const payload = validateJWT("invalid-token");
    expect(payload).toBeNull();
  });
});
```

### Portfolio Management Tests

**Portfolio Operations Tests**:
```typescript
describe("addAssetToPortfolio", () => {
  it("should add asset to user portfolio", async () => {
    const updatedUser = { ...mockRedisUser };
    updatedUser.portfolios.splint_invest.push(mockAsset);
    
    vi.mocked(redisUsers.addAssetToPortfolio).mockResolvedValue(updatedUser);

    const result = await addAssetToPortfolio(
      "user123",
      "splint_invest",
      mockAsset
    );

    expect(result).toBeDefined();
    expect(result?.portfolios.splint_invest).toContain(mockAsset);
  });

  it("should handle user not found", async () => {
    vi.mocked(redisUsers.addAssetToPortfolio).mockResolvedValue(null);

    const result = await addAssetToPortfolio(
      "nonexistent",
      "splint_invest",
      mockAsset
    );

    expect(result).toBeNull();
  });
});
```

### OAuth State Management Tests

**OAuth Flow Tests**:
```typescript
describe("OAuth State Management", () => {
  it("should store and retrieve authorization codes", async () => {
    const authCode = "auth_code_123";
    const codeData = {
      clientId: "client123",
      redirectUri: "https://example.com/callback",
      userId: "user123",
    };

    // Mock Redis operations
    vi.mocked(redis.set).mockResolvedValue("OK");
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(codeData));

    await storeAuthCode(authCode, codeData);
    const retrieved = await getAuthCode(authCode);

    expect(retrieved).toEqual(codeData);
  });
});
```

## Debugging Tests

### Common Issues

- **Timeout errors**: Check Redis/Pinecone mocking in setup.ts
- **Import errors**: Use "@" alias for all imports
- **Type errors**: Run typecheck first, fix TypeScript issues
- **Mock conflicts**: Ensure proper mock ordering in test files
- **Async authentication**: Ensure all Redis authentication functions are properly mocked as async

### Test Output

- Stderr console.error outputs are expected for error handling tests
- All tests should pass (green status)
- Check test coverage with detailed output

## Commit Guidelines

### Before Committing

1. `npm run typecheck` - All TypeScript errors fixed
2. `npm run test:run` - All tests passing
3. `npm run format` - Code properly formatted

### Commit Messages

- Use conventional commit format
- Focus on test changes: "test: add portfolio validation tests"
- Keep commits small and logical
- Never commit failing tests or broken code

## Test Coverage

Current coverage: **227 tests** across **17 test files**

- Core infrastructure: 61 tests
- Authentication: 67 tests
- API routes: 81 tests
- MCP integration: 18 tests

Target: Maintain 100% coverage for all critical business logic.

