# API Implementation Guidelines

This directory contains all API route handlers for the LuxBridge AI Mock API system.

## API Architecture

### Platform-Specific Routes (`[platform]/`)
- **Authentication**: `/auth/login`, `/auth/me` - JWT-based platform auth
- **Assets**: `/assets`, `/assets/[assetId]` - Asset discovery and retrieval
- **Portfolio**: `/portfolio` - User portfolio management and metrics

### Cross-Platform Routes
- **Analysis**: `/cross-platform/analysis` - Portfolio analysis across platforms
- **OAuth**: `/oauth/authorize`, `/oauth/token`, `/oauth/complete` - OAuth 2.1 flow

### MCP Transport (`[transport]/`)
- **SSE/HTTP**: Dynamic route supporting both transport protocols
- **Tools**: 4 MCP tools with Zod schema validation

## Development Rules

### Before Implementation
1. **Always run typecheck first**: `npm run typecheck`
2. Fix all TypeScript errors before proceeding
3. Write tests for new endpoints before implementation
4. Review existing patterns and follow conventions

### Implementation Standards

#### Route Handler Pattern
```typescript
import { NextRequest } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  // Define request validation
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await context.params;
    
    // Validate platform
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return Response.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
        { status: 400 }
      );
    }

    // Implementation logic
    
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
```

#### Authentication Pattern
```typescript
import { authenticateToken } from "@/lib/auth/authCommon";

const authHeader = request.headers.get("authorization");
const tokenPayload = authenticateToken(authHeader);

if (!tokenPayload) {
  return Response.json(
    { error: "unauthorized", message: "Invalid or missing token" },
    { status: 401 }
  );
}

if (tokenPayload.platform !== platform) {
  return Response.json(
    { error: "platform_mismatch", message: "Token platform does not match requested platform" },
    { status: 403 }
  );
}
```

#### Error Response Format
```typescript
{
  error: "error_code",        // Snake_case error identifier
  message: "Human readable"   // User-friendly message
}
```

### Route-Specific Guidelines

#### Dynamic Routes (`[platform]/`)
- Always validate platform parameter first
- Use proper TypeScript typing for params
- Handle async context.params correctly
- Implement consistent error responses

#### OAuth Routes
- Follow OAuth 2.1 specification exactly
- Use Redis for state management
- Implement proper PKCE flow
- Handle CORS headers correctly

#### MCP Routes
- Use Zod schemas for all tool parameters
- Implement proper authentication middleware
- Return MCP-compliant response format
- Handle both SSE and HTTP transports

## Testing Requirements

### Route Testing Pattern
```typescript
import { createMockContext, expectJSONResponse } from "@/__tests__/utils/testHelpers";

describe("Route Name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle successful request", async () => {
    const request = createMockRequest(validBody);
    const context = createMockContext({ platform: "splint_invest" });
    
    const response = await GET(request, context);
    const data = await expectJSONResponse(response, 200);
    
    expect(data).toMatchObject(expectedResponse);
  });

  it("should handle validation errors", async () => {
    // Test invalid inputs
  });

  it("should handle authentication errors", async () => {
    // Test unauthorized access
  });
});
```

### Required Test Coverage
- ✅ Valid request scenarios
- ✅ Input validation failures
- ✅ Authentication/authorization errors
- ✅ Platform validation
- ✅ Database/service errors
- ✅ CORS preflight requests

## Commit Guidelines

### Before Committing API Changes
1. `npm run typecheck` - Fix all TypeScript errors
2. `npm run test:run` - Ensure all tests pass
3. `npm run format` - Format code consistently
4. Test endpoints manually if needed

### Commit Message Format
```
feat: add portfolio metrics endpoint for platform analysis
fix: handle empty portfolio response in asset discovery
test: add comprehensive validation tests for auth endpoints
```

### Commit Size
- Keep commits small and logical
- One feature or fix per commit
- Include tests in the same commit as implementation
- Never commit broken or untested code

## Security Considerations

- Always validate platform parameters
- Implement proper JWT authentication
- Use rate limiting where appropriate
- Sanitize all user inputs
- Follow OAuth 2.1 security guidelines
- Never log sensitive data (tokens, passwords)

## Performance Guidelines

- Use Redis for caching when appropriate
- Implement proper pagination for large datasets
- Use Pinecone for efficient semantic search
- Handle concurrent requests gracefully
- Set appropriate timeout values
