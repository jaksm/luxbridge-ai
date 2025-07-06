# API Implementation Guidelines

This directory contains all API route handlers for the LuxBridge AI Mock API system.

## API Architecture

### Platform-Specific Routes (`[platform]/`)

- `/auth/login` - Platform credential authentication with Redis user validation
- `/auth/register` - **NEW**: User registration with bcrypt password hashing
- `/auth/me` - User profile retrieval with JWT token validation
- **Assets**: `/assets`, `/assets/[assetId]` - Asset discovery and retrieval
- **Portfolio**: `/portfolio` - User portfolio management and metrics

### Session-Based Authentication Routes (`auth/platforms/`)

- `/auth/platforms/[platform]/complete` - Session-based platform linking endpoint
- Handles session-to-platform credential linking for MCP authentication flow

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
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await context.params;

    // Validate platform
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return Response.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
        { status: 400 },
      );
    }

    // Implementation logic

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
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
    { status: 401 },
  );
}

if (tokenPayload.platform !== platform) {
  return Response.json(
    {
      error: "platform_mismatch",
      message: "Token platform does not match requested platform",
    },
    { status: 403 },
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

### Authentication Endpoints

#### Platform Registration (`/api/[platform]/auth/register`)

**Purpose**: Create new platform user accounts with Redis storage

**Implementation**:

```typescript
import { registerUser } from "@/lib/auth/authCommon";
import { generateJWT } from "@/lib/auth/jwtUtils";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  // Platform validation
  const { platform } = await context.params;
  if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }

  // Input validation with Zod
  const validation = RegisterSchema.safeParse(await request.json());
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "validation_error",
        details: validation.error.issues,
      },
      { status: 400 },
    );
  }

  // User registration
  const result = await registerUser({
    email: validation.data.email,
    password: validation.data.password,
    name: validation.data.name,
    scenario: "empty_portfolio",
  });

  if (!result.success) {
    const status = result.error === "User already exists" ? 409 : 400;
    return NextResponse.json(
      { error: "registration_failed", message: result.error },
      { status },
    );
  }

  // Generate platform JWT
  const accessToken = generateJWT(result.user!.userId, platform);
  return NextResponse.json({
    accessToken,
    userId: result.user!.userId,
    expiresIn: 86400,
    platform,
  });
}
```

**Key Features**:

- Zod schema validation for all inputs
- Email uniqueness checking
- bcrypt password hashing (12 salt rounds)
- Empty portfolio initialization
- Immediate JWT token generation
- Comprehensive error handling

#### Platform Login (`/api/[platform]/auth/login`)

**Purpose**: Authenticate existing platform users

**Implementation**:

```typescript
import { validateCredentials } from "@/lib/auth/authCommon";
import { generateJWT } from "@/lib/auth/jwtUtils";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  // Platform and input validation
  const { platform } = await context.params;
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      {
        error: "missing_credentials",
        message: "Email and password are required",
      },
      { status: 400 },
    );
  }

  // Redis-backed credential validation
  const result = await validateCredentials(email, password);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "invalid_credentials",
        message: "Invalid email or password",
      },
      { status: 401 },
    );
  }

  // Generate platform-specific JWT
  const accessToken = generateJWT(result.user!.userId, platform);
  return NextResponse.json({
    accessToken,
    userId: result.user!.userId,
    expiresIn: 86400,
    platform,
  });
}
```

**Key Features**:

- Redis user lookup and validation
- bcrypt password verification
- Platform-specific JWT generation
- Consistent error responses

#### User Profile (`/api/[platform]/auth/me`)

**Purpose**: Retrieve authenticated user information

**Implementation**:

```typescript
import { authenticateToken, getUserById } from "@/lib/auth/authCommon";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  // Platform validation
  const { platform } = await context.params;

  // JWT token authentication
  const authHeader = request.headers.get("authorization");
  const tokenPayload = authenticateToken(authHeader);

  if (!tokenPayload) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (tokenPayload.platform !== platform) {
    return NextResponse.json(
      {
        error: "platform_mismatch",
        message: "Token platform does not match requested platform",
      },
      { status: 403 },
    );
  }

  // Redis user lookup (async)
  const user = await getUserById(tokenPayload.userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    userId: user.userId,
    name: user.name,
    email: user.email,
    platform,
  });
}
```

**Key Features**:

- Bearer token extraction and validation
- Platform token verification
- Async Redis user lookup
- Secure user data response (no password)

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
import {
  createMockContext,
  expectJSONResponse,
} from "@/__tests__/utils/testHelpers";

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

## API Architecture

### Platform-Specific Routes (`[platform]/`)

- `/auth/login` - Platform credential authentication with Redis user validation
- `/auth/register` - **NEW**: User registration with bcrypt password hashing
- `/auth/me` - User profile retrieval with JWT token validation
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

### Implementation Standards

#### Route Handler Pattern

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const { platform } = await context.params;

    // Validate platform
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return Response.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
        { status: 400 },
      );
    }
    // Implementation logic

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
```

#### Authentication Pattern

```typescript
import { authenticateToken } from "@/lib/auth/authCommon";
if (!tokenPayload) {
  return Response.json(
    { error: "unauthorized", message: "Invalid or missing token" },
    { status: 401 },
  );
}
if (tokenPayload.platform !== platform) {
  return Response.json(
    {
      error: "platform_mismatch",
      message: "Token platform does not match requested platform",
    },
    { status: 403 },
  );
}
```

#### Error Response Format

````typescript
{
  error: "error_code",        // Snake_case error identifier
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
## Testing Requirements
### Route Testing Pattern

```typescript
import {
  createMockContext,
  expectJSONResponse,
} from "@/__tests__/utils/testHelpers";
describe("Route Name", () => {
  beforeEach(() => {
  it("should handle successful request", async () => {
    const request = createMockRequest(validBody);
    const context = createMockContext({ platform: "splint_invest" });

    const response = await GET(request, context);
    const data = await expectJSONResponse(response, 200);

    expect(data).toMatchObject(expectedResponse);
  });
````

### Required Test Coverage

- ✅ Valid request scenarios
- ✅ Input validation failures
- ✅ Authentication/authorization errors

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
```

### Commit Size

- Keep commits small and logical
- One feature or fix per commit
- Include tests in the same commit as implementation
- Implement proper pagination for large datasets
- Use Pinecone for efficient semantic search
- Handle concurrent requests gracefully
- Set appropriate timeout values
