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
- **Pinecone**: Mocked vector search and upsert operations
- **OpenAI**: Mocked embedding generation
- **JWT**: Mocked token signing and verification
- **Fetch**: Enhanced response mocking with clone support

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

## Debugging Tests

### Common Issues

- **Timeout errors**: Check Redis/Pinecone mocking in setup.ts
- **Import errors**: Use "@" alias for all imports
- **Type errors**: Run typecheck first, fix TypeScript issues
- **Mock conflicts**: Ensure proper mock ordering in test files

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

````bash
npm run typecheck  # Fix any TypeScript errors first
npm run test       # Run tests in watch mode
## Test Requirements
### Before Implementation

1. Run `npm run typecheck` and fix all TypeScript errors
2. Ensure all existing tests pass
3. Write tests for new functionality before implementation (TDD)
### Test Standards

- Mock all external dependencies (Redis, Pinecone, OpenAI, JWT)
- Use realistic test data that matches production structures
- Test both success and error scenarios
- Maintain 100% test coverage for critical paths
### Mock Configuration

All mocks are configured in `__tests__/setup.ts`:

- **Redis**: Mocked client with all operations
- **Pinecone**: Mocked vector search and upsert operations
- **OpenAI**: Mocked embedding generation
- **Fetch**: Enhanced response mocking with clone support
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
````

#### Mock Setup

```typescript
beforeEach(() => {
  vi.clearAllMocks();
```

#### Error Testing

```typescript
vi.mocked(mockFunction).mockRejectedValue(new Error("Expected error"));
await expect(functionUnderTest()).rejects.toThrow("Expected error");
## Debugging Tests
### Common Issues

- **Timeout errors**: Check Redis/Pinecone mocking in setup.ts
- **Import errors**: Use "@" alias for all imports
- **Type errors**: Run typecheck first, fix TypeScript issues
- **Mock conflicts**: Ensure proper mock ordering in test files
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
## Test Coverage
Current coverage: **227 tests** across **17 test files**

- Core infrastructure: 61 tests
- Authentication: 67 tests
- API routes: 81 tests
- MCP integration: 18 tests
Target: Maintain 100% coverage for all critical business logic.
```
