import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyAuthToken = vi.fn();

vi.mock("@privy-io/server-auth", () => ({
  PrivyClient: vi.fn().mockImplementation(() => ({
    verifyAuthToken: mockVerifyAuthToken,
  })),
}));

describe("verifyPrivyToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return undefined for undefined token", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const result = await verifyPrivyToken(mockRequest, undefined);
    expect(result).toBeUndefined();
    expect(mockVerifyAuthToken).not.toHaveBeenCalled();
  });

  it("should return undefined for empty string token", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const result = await verifyPrivyToken(mockRequest, "");
    expect(result).toBeUndefined();
    expect(mockVerifyAuthToken).not.toHaveBeenCalled();
  });

  it("should return user data for valid Privy token", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const token = "valid_privy_token_123";
    const mockVerifiedClaims = {
      userId: "privy_user_123",
      appId: "test-app-id",
      issuer: "privy.io",
      expiration: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    mockVerifyAuthToken.mockResolvedValue(mockVerifiedClaims);

    const result = await verifyPrivyToken(mockRequest, token);

    expect(result).toBeDefined();
    expect(result.userId).toBe("privy_user_123");
    expect(result.scopes).toEqual(["read", "write"]);
    expect(result.expiresAt).toBe(mockVerifiedClaims.expiration);
    expect(result.metadata).toEqual({
      appId: "test-app-id",
      issuer: "privy.io",
    });
    expect(mockVerifyAuthToken).toHaveBeenCalledWith(token);
  });

  it("should return undefined when Privy token verification fails", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const token = "invalid_privy_token";

    mockVerifyAuthToken.mockRejectedValue(
      new Error("Token verification failed"),
    );

    const result = await verifyPrivyToken(mockRequest, token);

    expect(result).toBeUndefined();
    expect(mockVerifyAuthToken).toHaveBeenCalledWith(token);
  });

  it("should handle network errors gracefully", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const token = "network_error_token";

    mockVerifyAuthToken.mockRejectedValue(new Error("Network error"));

    const result = await verifyPrivyToken(mockRequest, token);

    expect(result).toBeUndefined();
    expect(mockVerifyAuthToken).toHaveBeenCalledWith(token);
  });

  it("should handle malformed token responses", async () => {
    const { verifyPrivyToken } = await import("@/lib/auth/privy-verifier");
    const mockRequest = new Request("http://example.com");
    const token = "malformed_token";

    mockVerifyAuthToken.mockResolvedValue({
      userId: null,
      appId: undefined,
    });

    const result = await verifyPrivyToken(mockRequest, token);

    expect(result).toBeDefined();
    expect(result.userId).toBeNull();
    expect(result.scopes).toEqual(["read", "write"]);
    expect(result.metadata.appId).toBeUndefined();
  });
});
