import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/oauth/complete/route";

vi.mock("@/lib/auth/privy-verifier", () => ({
  verifyPrivyToken: vi.fn(),
}));

vi.mock("@/lib/redis-oauth", () => ({
  getAuthCode: vi.fn(),
  storeAuthCode: vi.fn(),
}));

describe("OAuth Complete Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  };

  it("should return 400 when auth_code is missing", async () => {
    const request = createMockRequest({
      privy_token: "valid_token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Missing required fields: auth_code and privy_token",
    );
  });

  it("should return 400 when privy_token is missing", async () => {
    const request = createMockRequest({
      auth_code: "valid_auth_code",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Missing required fields: auth_code and privy_token",
    );
  });

  it("should return 401 when Privy token verification fails", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    vi.mocked(verifyPrivyToken).mockResolvedValue(undefined);

    const request = createMockRequest({
      auth_code: "valid_auth_code",
      privy_token: "invalid_token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid Privy token");
    expect(verifyPrivyToken).toHaveBeenCalledWith(request, "invalid_token");
  });

  it("should return 400 when auth code is not found", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const { getAuthCode } = await import("@/lib/redis-oauth");

    const mockAuthInfo = {
      userId: "privy_user_123",
      scopes: ["read", "write"],
      metadata: { appId: "test-app" },
    };

    vi.mocked(verifyPrivyToken).mockResolvedValue(mockAuthInfo);
    vi.mocked(getAuthCode).mockResolvedValue(null);

    const request = createMockRequest({
      auth_code: "nonexistent_code",
      privy_token: "valid_token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid or expired authorization code");
  });

  it("should successfully update auth code with user info", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const { getAuthCode, storeAuthCode } = await import("@/lib/redis-oauth");

    const mockAuthInfo = {
      userId: "privy_user_123",
      scopes: ["read", "write"],
      metadata: { appId: "test-app" },
    };

    const mockAuthCode = {
      code: "valid_auth_code",
      clientId: "test_client",
      redirectUri: "http://localhost:3000/callback",
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      userId: "test_user",
    };

    vi.mocked(verifyPrivyToken).mockResolvedValue(mockAuthInfo);
    vi.mocked(getAuthCode).mockResolvedValue(mockAuthCode);
    vi.mocked(storeAuthCode).mockResolvedValue(undefined);

    const request = createMockRequest({
      auth_code: "valid_auth_code",
      privy_token: "valid_token",
      user_data: {
        email: "user@example.com",
        privy_user_id: "privy_user_123",
        wallet_address: "0x123...",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(storeAuthCode).toHaveBeenCalledWith({
      ...mockAuthCode,
      userId: "privy_user_123",
    });
  });

  it("should handle Privy token verification errors", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    vi.mocked(verifyPrivyToken).mockRejectedValue(new Error("Network error"));

    const request = createMockRequest({
      auth_code: "valid_auth_code",
      privy_token: "error_token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should handle Redis errors gracefully", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const { getAuthCode } = await import("@/lib/redis-oauth");

    const mockAuthInfo = {
      userId: "privy_user_123",
      scopes: ["read", "write"],
      metadata: { appId: "test-app" },
    };

    vi.mocked(verifyPrivyToken).mockResolvedValue(mockAuthInfo);
    vi.mocked(getAuthCode).mockRejectedValue(
      new Error("Redis connection failed"),
    );

    const request = createMockRequest({
      auth_code: "valid_auth_code",
      privy_token: "valid_token",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should handle malformed request body", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
