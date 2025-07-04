import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/authenticate-request";

vi.mock("@/lib/redis-oauth", () => ({
  getAccessToken: vi.fn(),
}));

describe("MCP Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticateRequest", () => {
    const createMockRequest = (authHeader?: string) => {
      const headers = new Headers();
      if (authHeader) {
        headers.set("authorization", authHeader);
      }
      return {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "authorization") {
              return authHeader || null;
            }
            return null;
          }),
        },
      } as unknown as NextRequest;
    };

    it("should return null when no auth header is present", async () => {
      const request = createMockRequest();

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should return null when auth header has no token", async () => {
      const request = createMockRequest("Bearer");

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should return null when token is not found in Redis", async () => {
      const { getAccessToken } = await import("@/lib/redis-oauth");
      vi.mocked(getAccessToken).mockResolvedValue(null);
      const request = createMockRequest("Bearer valid_token");

      const result = await authenticateRequest(request);

      expect(getAccessToken).toHaveBeenCalledWith("valid_token");
      expect(result).toBeNull();
    });

    it("should return null when token is expired", async () => {
      const { getAccessToken } = await import("@/lib/redis-oauth");
      const expiredToken = {
        token: "expired_token",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        clientId: "test_client",
        userId: "test_user",
      };
      vi.mocked(getAccessToken).mockResolvedValue(expiredToken);
      const request = createMockRequest("Bearer expired_token");

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should return access token when valid and not expired", async () => {
      const { getAccessToken } = await import("@/lib/redis-oauth");
      const validToken = {
        token: "valid_token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        clientId: "test_client",
        userId: "test_user",
      };
      vi.mocked(getAccessToken).mockResolvedValue(validToken);
      const request = createMockRequest("Bearer valid_token");

      const result = await authenticateRequest(request);

      expect(result).toEqual(validToken);
    });

    it("should handle Redis errors gracefully", async () => {
      const { getAccessToken } = await import("@/lib/redis-oauth");
      vi.mocked(getAccessToken).mockRejectedValue(new Error("Redis error"));
      const request = createMockRequest("Bearer error_token");

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should extract token correctly from bearer auth", async () => {
      const { getAccessToken } = await import("@/lib/redis-oauth");
      const validToken = {
        token: "test_token_123",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        clientId: "test_client",
        userId: "test_user",
      };
      vi.mocked(getAccessToken).mockResolvedValue(validToken);
      const request = createMockRequest("Bearer test_token_123");

      const result = await authenticateRequest(request);

      expect(getAccessToken).toHaveBeenCalledWith("test_token_123");
      expect(result).toEqual(validToken);
    });

    it("should handle malformed auth headers", async () => {
      const request = createMockRequest("InvalidFormat");

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });

    it("should handle empty token after Bearer", async () => {
      const request = createMockRequest("Bearer ");

      const result = await authenticateRequest(request);

      expect(result).toBeNull();
    });
  });
});
