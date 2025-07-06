# Next.js App Directory Guidelines

This directory contains the Next.js 15 app router implementation for LuxBridge AI Mock API.

## App Router Structure

### Route Organization

- `api/` - API route handlers (see `api/CLAUDE.md` for detailed guidelines)
- `oauth/` - **Dual authentication flows**: LuxBridge OAuth 2.1 + Platform registration/login
- `[transport]/` - Dynamic MCP transport routes (SSE/HTTP)
- `page.tsx` - Root application page
- `layout.tsx` - Root layout and providers

### Authentication Directory Structure

**LuxBridge OAuth 2.1** (Primary Authentication):

- `oauth/authorize/page.tsx` - Main OAuth authorization with Privy integration

**Platform Authentication** (RWA Platform Access):

**OAuth-Based Platform Auth**:
- `oauth/[platform]/authorize/page.tsx` - Platform-specific login pages
- `oauth/[platform]/register/page.tsx` - Platform-specific registration pages

**Session-Based Platform Auth** (Primary Flow):
- `auth/[platform]/page.tsx` - Session-preserving platform authentication
- `auth/[platform]/register/page.tsx` - Session-preserving registration with auto-return
- `auth/[platform]/complete/page.tsx` - Platform linking completion

**Supported Platforms**:

- `oauth/splint_invest/` & `auth/splint-invest/` - Splint Invest authentication flows
- `oauth/masterworks/` & `auth/masterworks/` - Masterworks authentication flows
- `oauth/realt/` & `auth/realt/` - RealT authentication flows

## Development Rules

### Before Implementation

1. **Always run typecheck first**: `npm run typecheck`
2. Fix all TypeScript errors before proceeding
3. Follow Next.js 15 app router conventions
4. Review existing patterns in similar components

### Next.js App Router Patterns

#### Dynamic Routes

```typescript
// app/[transport]/route.ts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transport: string }> },
) {
  const { transport } = await context.params;

  // Handle dynamic segment
  if (!["sse", "mcp"].includes(transport)) {
    return new Response("Not Found", { status: 404 });
  }

  // Implementation
}
```

#### Page Components

```typescript
// app/oauth/authorize/page.tsx
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Implementation
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

#### Layout Components

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
```

### Route Handler Guidelines

#### HTTP Methods

```typescript
// Support all necessary HTTP methods
export async function GET(request: NextRequest) {
  /* ... */
}
export async function POST(request: NextRequest) {
  /* ... */
}
export async function OPTIONS() {
  /* CORS handling */
}
```

#### Error Handling

```typescript
export async function POST(request: NextRequest) {
  try {
    // Implementation
    return Response.json({ success: true });
  } catch (error) {
    console.error("Route error:", error);
    return Response.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
```

#### CORS Headers

```typescript
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

### Dual Authentication Implementation

#### Authentication Flow Architecture

The app implements **two distinct authentication systems**:

**1. LuxBridge OAuth 2.1 Flow** (`oauth/authorize/page.tsx`):

- **Purpose**: Main application access and MCP server authorization
- **Integration**: Privy-based email authentication with PKCE
- **UI Pattern**: Privy login components with OAuth parameter handling
- **State Management**: Redis-based OAuth state with authorization codes

**2. Platform Authentication Flow** (`oauth/[platform]/authorize|register/page.tsx`):

- **Purpose**: Individual RWA platform access (Splint Invest, Masterworks, RealT)
- **Registration**: Full user registration with email, password, name
- **Login**: Credential-based authentication with platform-specific JWT tokens
- **UI Pattern**: Platform-branded forms with shared components

#### Platform Authentication Components

**Shared Components** (`components/auth/`):

- `PlatformRegisterForm` - Reusable registration form with platform branding
- `PlatformAuthorizeForm` - Reusable login form with platform-specific styling

**Session-Based Auth Flow Pattern** (Primary):

```typescript
// auth/[platform]/page.tsx - Session-preserving authentication
export default function PlatformAuthPage({ params }: AuthPageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  
  // Handles session-based platform linking with register navigation
  return <PlatformAuthForm platform={platform} sessionId={sessionId} />;
}

// auth/[platform]/register/page.tsx - Session-preserving registration
export default function PlatformRegisterPage({ params }: RegisterPageProps) {
  const { platform } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  
  // Auto-redirects back to auth page after successful registration
  return <PlatformRegisterForm platform={platform} sessionId={sessionId} />;
}
```

**OAuth-Based Flow Pattern** (Alternative):

```typescript
// oauth/[platform]/register/page.tsx
export default function PlatformRegisterPage() {
  return <PlatformRegisterForm platform="splint_invest" />;
}

// oauth/[platform]/authorize/page.tsx
export default function PlatformAuthorizePage() {
  return <PlatformAuthorizeForm platform="splint_invest" />;
}
```

**Form Features**:

- Email validation and duplicate checking
- Password strength requirements (6+ characters)
- Confirm password matching
- Platform-specific branding and descriptions
- **Session preservation**: Session ID maintained throughout auth/register flow
- **Seamless navigation**: "Register here" and "Sign in here" links with session context
- **Auto-redirect**: Registration automatically returns to auth page
- Comprehensive error handling

#### Platform Registration Form

**Key Features**:

```typescript
interface PlatformRegisterFormProps {
  platform: PlatformType; // "splint_invest" | "masterworks" | "realt"
}

// Form validation
const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

// Registration flow
const handleSubmit = async (e: React.FormEvent) => {
  // Validate form data
  // POST to /api/[platform]/auth/register
  // Handle success/error states
  // Redirect on successful registration
};
```

**Security Features**:

- Client-side form validation with Zod schemas
- Password visibility toggles
- CSRF protection
- Secure error handling
- Input sanitization

#### Platform Authorization Form

**Key Features**:

```typescript
interface PlatformAuthorizeFormProps {
  platform: PlatformType;
}

// Login flow
const handleSubmit = async (e: React.FormEvent) => {
  // Validate credentials
  // POST to /api/[platform]/auth/login
  // Handle authentication response
  // Redirect on successful login
};
```

**User Experience**:

- Platform-specific branding and colors
- Registration link integration
- Loading states and progress indicators
- Comprehensive error messaging
- Responsive design

### OAuth Implementation

#### LuxBridge Authorization Page Pattern

```typescript
// app/oauth/authorize/page.tsx
export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Validate OAuth parameters
  const clientId = params.client_id as string;
  const redirectUri = params.redirect_uri as string;

  if (!clientId || !redirectUri) {
    return <ErrorPage error="Invalid OAuth parameters" />;
  }

  return <AuthorizeForm clientId={clientId} redirectUri={redirectUri} />;
}
```

#### Form Handling

```typescript
"use client";

export function AuthorizeForm({ clientId, redirectUri }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      // Handle form submission
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### MCP Transport Handling

#### Dynamic Transport Routes

```typescript
// app/[transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";

const handler = createMcpHandler({
  // MCP configuration
});

export const GET = handler.GET;
export const POST = handler.POST;
export const maxDuration = 60;
```

#### Transport Validation

```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transport: string }> },
) {
  const { transport } = await context.params;

  if (!["sse", "mcp"].includes(transport)) {
    return new Response("Unsupported transport", { status: 400 });
  }

  // Handle transport-specific logic
}
```

## Testing Requirements

### Page Component Testing

```typescript
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("should render page correctly", () => {
  render(<PageComponent />);
  expect(screen.getByText("Expected content")).toBeInTheDocument();
});
```

### Route Handler Testing

```typescript
import { createMockRequest } from "@/__tests__/utils/testHelpers";

test("should handle GET request", async () => {
  const request = createMockRequest();
  const response = await GET(request);

  expect(response.status).toBe(200);
});
```

## Performance Guidelines

### Static Generation

```typescript
// Use static generation where possible
export const dynamic = "force-static";

// Or configure specific behavior
export const revalidate = 3600; // Revalidate every hour
```

### Dynamic Imports

```typescript
// Lazy load heavy components
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <Loading />,
});
```

### Edge Runtime

```typescript
// Use edge runtime for better performance
export const runtime = "edge";
```

## Security Guidelines

### Input Validation

```typescript
// Validate all inputs
const schema = z.object({
  email: z.string().email(),
  clientId: z.string().min(1),
});

const result = schema.safeParse(formData);
if (!result.success) {
  return Response.json({ error: "Invalid input" }, { status: 400 });
}
```

### Authentication

```typescript
// Always validate authentication
const authHeader = request.headers.get("authorization");
if (!authHeader) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

### CSRF Protection

```typescript
// Implement CSRF protection for forms
if (request.method === "POST") {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin !== `https://${host}`) {
    return Response.json({ error: "CSRF check failed" }, { status: 403 });
  }
}
```

## Commit Guidelines

### Before Committing App Changes

1. `npm run typecheck` - Fix all TypeScript errors
2. `npm run test:run` - Ensure all tests pass
3. `npm run format` - Format code consistently
4. Test pages manually in browser

### Commit Message Format

```
feat: add OAuth authorization page with PKCE support
fix: handle edge case in MCP transport routing
style: improve authorization form UI consistency
test: add comprehensive OAuth flow testing
```

### File Organization

- Keep route handlers focused and single-purpose
- Use proper TypeScript types for all props
- Implement proper error boundaries
- Follow Next.js naming conventions

## Environment Considerations

### Development

- Use `npm run dev` for local development
- Set up proper environment variables
- Test both SSE and HTTP transport modes

### Production

- Optimize for Vercel deployment
- Use proper caching strategies
- Implement monitoring and logging
- Handle edge cases gracefully

## App Router Structure

### Route Organization

- `api/` - API route handlers (see `api/CLAUDE.md` for detailed guidelines)
- `oauth/` - OAuth 2.1 authorization pages and flows
- `[transport]/` - Dynamic MCP transport routes (SSE/HTTP)

## Development Rules

### Before Implementation

1. **Always run typecheck first**: `npm run typecheck`
2. Fix all TypeScript errors before proceeding
3. Follow Next.js 15 app router conventions

### Next.js App Router Patterns

#### Dynamic Routes

```typescript
// app/[transport]/route.ts
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transport: string }> },
) {
  const { transport } = await context.params;

  // Handle dynamic segment
  if (!["sse", "mcp"].includes(transport)) {
    return new Response("Not Found", { status: 404 });
  }

  // Implementation
}
```

#### Page Components

```typescript
// app/oauth/authorize/page.tsx
interface PageProps {
export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Implementation
  return (
    <div>
```

#### Layout Components

````typescript
// app/layout.tsx
export default function RootLayout({
### Route Handler Guidelines
#### HTTP Methods

```typescript
// Support all necessary HTTP methods
export async function GET(request: NextRequest) {
  /* ... */
}
export async function POST(request: NextRequest) {
  /* ... */
}
export async function OPTIONS() {
  /* CORS handling */
}
````

#### Error Handling

```typescript
export async function POST(request: NextRequest) {
  try {
    console.error("Route error:", error);
    return Response.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
```

#### CORS Headers

````typescript
export async function OPTIONS() {
  return new Response(null, {
### OAuth Implementation
#### Authorization Page Pattern

```typescript
// app/oauth/authorize/page.tsx
export default async function AuthorizePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Validate OAuth parameters
  const clientId = params.client_id as string;
  const redirectUri = params.redirect_uri as string;

  if (!clientId || !redirectUri) {
    return <ErrorPage error="Invalid OAuth parameters" />;
  }

  return <AuthorizeForm clientId={clientId} redirectUri={redirectUri} />;
}
````

#### Form Handling

````typescript
"use client";
export function AuthorizeForm({ clientId, redirectUri }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      setIsLoading(false);
    }
  };

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
### MCP Transport Handling
#### Dynamic Transport Routes

```typescript
// app/[transport]/route.ts
import { createMcpHandler } from "@vercel/mcp-adapter";
````

#### Transport Validation

```typescript
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ transport: string }> },
) {
  const { transport } = await context.params;

  if (!["sse", "mcp"].includes(transport)) {
    return new Response("Unsupported transport", { status: 400 });
  }

  // Handle transport-specific logic
}
```

## Testing Requirements

### Page Component Testing

```typescript
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
```

### Route Handler Testing

```typescript
import { createMockRequest } from "@/__tests__/utils/testHelpers";
test("should handle GET request", async () => {
  const request = createMockRequest();
  const response = await GET(request);

  expect(response.status).toBe(200);
});
```

## Performance Guidelines

### Static Generation

```typescript
// Use static generation where possible
export const dynamic = "force-static";
// Or configure specific behavior
export const revalidate = 3600; // Revalidate every hour
```

### Dynamic Imports

```typescript
// Lazy load heavy components
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
```

### Edge Runtime

```typescript
// Use edge runtime for better performance
export const runtime = "edge";
```

## Security Guidelines

### Input Validation

```typescript
// Validate all inputs
const schema = z.object({
```

### Authentication

```typescript
// Always validate authentication
const authHeader = request.headers.get("authorization");
```

### CSRF Protection

```typescript
// Implement CSRF protection for forms
if (request.method === "POST") {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin !== `https://${host}`) {
    return Response.json({ error: "CSRF check failed" }, { status: 403 });
  }
## Commit Guidelines
### Before Committing App Changes

1. `npm run typecheck` - Fix all TypeScript errors
2. `npm run test:run` - Ensure all tests pass
3. `npm run format` - Format code consistently
4. Test pages manually in browser
### Commit Message Format

```

feat: add OAuth authorization page with PKCE support
fix: handle edge case in MCP transport routing

```
### File Organization

- Keep route handlers focused and single-purpose
- Use proper TypeScript types for all props
- Implement proper error boundaries
## Environment Considerations
### Development

- Use `npm run dev` for local development
- Set up proper environment variables
- Test both SSE and HTTP transport modes
### Production

- Optimize for Vercel deployment
- Use proper caching strategies
- Implement monitoring and logging
- Handle edge cases gracefully
```
