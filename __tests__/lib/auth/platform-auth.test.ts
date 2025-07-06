import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validatePlatformCredentials,
  storePlatformLink,
  getPlatformLink,
  deletePlatformLink,
  updatePlatformLinkActivity,
  makeAuthenticatedPlatformCall,
  getAllUserPlatformLinks,
  validateAllPlatformLinks,
} from "@/lib/auth/platform-auth";
import { PlatformLink, PlatformAuthResult } from "@/lib/types/luxbridge-auth";
import { PlatformType } from "@/lib/types/platformAsset";
import {
  mockEnvironmentVariables,
  mockFetchResponse,
} from "@/__tests__/utils/testHelpers";

vi.mock("@/lib/redis", () => ({
  default: {
    setEx: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@/lib/auth/session-manager");

describe("Platform Authentication", () => {
  const mockRedis = vi.mocked(await import("@/lib/redis"));
  const mockSessionManager = vi.mocked(
    await import("@/lib/auth/session-manager"),
  );
  const redis = mockRedis.default;

  // Mock global fetch
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironmentVariables();
  });

  describe("validatePlatformCredentials", () => {
    it("should validate credentials successfully", async () => {
      const platform: PlatformType = "splint_invest";
      const email = "test@example.com";
      const password = "password123";

      const mockResponse = {
        userId: "platform_user_123",
        name: "Test User",
        accessToken: "platform_access_token",
        expiresIn: 86400,
      };

      mockFetch.mockResolvedValue(mockFetchResponse(mockResponse, 200, true));

      const result = await validatePlatformCredentials(
        platform,
        email,
        password,
      );

      expect(result).toEqual({
        success: true,
        user: {
          userId: "platform_user_123",
          email: "test@example.com",
          name: "Test User",
        },
        accessToken: "platform_access_token",
        expiresAt: expect.any(Number),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/splint_invest/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
    });

    it("should handle invalid credentials", async () => {
      const platform: PlatformType = "masterworks";
      const email = "test@example.com";
      const password = "wrongpassword";

      mockFetch.mockResolvedValue(mockFetchResponse({}, 401, false));

      const result = await validatePlatformCredentials(
        platform,
        email,
        password,
      );

      expect(result).toEqual({
        success: false,
        error: "Invalid credentials",
      });
    });

    it("should handle other HTTP errors", async () => {
      const platform: PlatformType = "realt";
      const email = "test@example.com";
      const password = "password123";

      mockFetch.mockResolvedValue(mockFetchResponse({}, 500, false));

      const result = await validatePlatformCredentials(
        platform,
        email,
        password,
      );

      expect(result).toEqual({
        success: false,
        error: "Authentication failed",
      });
    });

    it("should handle network errors", async () => {
      const platform: PlatformType = "splint_invest";
      const email = "test@example.com";
      const password = "password123";

      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await validatePlatformCredentials(
        platform,
        email,
        password,
      );

      expect(result).toEqual({
        success: false,
        error: "Network error",
      });
    });

    it("should use custom API URL when set", async () => {
      process.env.NEXT_PUBLIC_API_URL = "https://custom-api.com";

      const platform: PlatformType = "splint_invest";
      const email = "test@example.com";
      const password = "password123";

      mockFetch.mockResolvedValue(
        mockFetchResponse({ userId: "test", name: "Test" }, 200, true),
      );

      await validatePlatformCredentials(platform, email, password);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom-api.com/api/splint_invest/auth/login",
        expect.any(Object),
      );
    });
  });

  describe("storePlatformLink", () => {
    it("should store platform link with default TTL", async () => {
      const linkData = {
        platform: "splint_invest" as PlatformType,
        luxUserId: "lux_user_123",
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
      };

      const result = await storePlatformLink(linkData);

      expect(result).toEqual({
        ...linkData,
        linkedAt: expect.any(String),
        lastUsedAt: expect.any(String),
        status: "active",
      });

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        24 * 60 * 60, // Default 24 hour TTL
        expect.stringContaining('"status":"active"'),
      );
    });

    it("should store platform link with custom token expiry", async () => {
      const tokenExpiry = Date.now() + 12 * 60 * 60 * 1000; // 12 hours from now
      const linkData = {
        platform: "masterworks" as PlatformType,
        luxUserId: "lux_user_123",
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry,
      };

      await storePlatformLink(linkData);

      const expectedTTL = Math.floor((tokenExpiry - Date.now()) / 1000);
      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:masterworks",
        expect.any(Number), // TTL should be based on token expiry
        expect.any(String),
      );
    });

    it("should handle expired token expiry gracefully", async () => {
      const tokenExpiry = Date.now() - 1000; // 1 second ago (expired)
      const linkData = {
        platform: "realt" as PlatformType,
        luxUserId: "lux_user_123",
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry,
      };

      await storePlatformLink(linkData);

      // Should use redis.set instead of setEx for expired tokens
      expect(redis.set).toHaveBeenCalledWith(
        "platform_link:lux_user_123:realt",
        expect.any(String),
      );
    });
  });

  describe("getPlatformLink", () => {
    it("should retrieve valid platform link", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "splint_invest";
      const mockPlatformLink: PlatformLink = {
        platform,
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPlatformLink));

      const result = await getPlatformLink(luxUserId, platform);

      expect(result).toEqual(mockPlatformLink);
      expect(redis.get).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
      );
    });

    it("should return null for non-existent platform link", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "masterworks";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getPlatformLink(luxUserId, platform);

      expect(result).toBeNull();
    });

    it("should handle expired platform link", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "realt";
      const expiredPlatformLink: PlatformLink = {
        platform,
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() - 1000, // Expired 1 second ago
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify(expiredPlatformLink),
      );

      const result = await getPlatformLink(luxUserId, platform);

      expect(result).toBeNull();
      expect(redis.del).toHaveBeenCalledWith(
        "platform_link:lux_user_123:realt",
      );
    });

    it("should handle Redis errors gracefully", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "splint_invest";

      vi.mocked(redis.get).mockRejectedValue(new Error("Redis error"));

      const result = await getPlatformLink(luxUserId, platform);

      expect(result).toBeNull();
    });
  });

  describe("deletePlatformLink", () => {
    it("should delete platform link", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "splint_invest";

      await deletePlatformLink(luxUserId, platform);

      expect(redis.del).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
      );
    });

    it("should handle deletion errors gracefully", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "masterworks";

      vi.mocked(redis.del).mockRejectedValue(new Error("Redis error"));

      // Should not throw error
      await deletePlatformLink(luxUserId, platform);
    });
  });

  describe("updatePlatformLinkActivity", () => {
    it("should update platform link activity", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "splint_invest";
      const mockPlatformLink: PlatformLink = {
        platform,
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        status: "active",
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockPlatformLink));

      await updatePlatformLinkActivity(luxUserId, platform);

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        expect.any(Number),
        expect.stringContaining('"lastUsedAt"'),
      );
    });

    it("should handle non-existent platform link", async () => {
      const luxUserId = "lux_user_123";
      const platform: PlatformType = "masterworks";

      vi.mocked(redis.get).mockResolvedValue(null);

      await updatePlatformLinkActivity(luxUserId, platform);

      expect(redis.setEx).not.toHaveBeenCalled();
    });
  });

  describe("makeAuthenticatedPlatformCall", () => {
    it("should make authenticated API call", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "access_token_789",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
          },
          masterworks: null,
          realt: null,
        },
      };

      const mockApiResponse = { portfolio: { holdings: [] } };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);
      mockSessionManager.updateSessionPlatformLink.mockResolvedValue();
      mockFetch.mockResolvedValue(
        mockFetchResponse(mockApiResponse, 200, true),
      );

      const result = await makeAuthenticatedPlatformCall(
        sessionId,
        platform,
        endpoint,
      );

      expect(result).toEqual(mockApiResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/splint_invest/portfolio",
        {
          headers: {
            Authorization: "Bearer access_token_789",
            "Content-Type": "application/json",
          },
        },
      );
    });

    it("should handle invalid session", async () => {
      const sessionId = "invalid_session";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      mockSessionManager.getAuthSession.mockResolvedValue(null);

      await expect(
        makeAuthenticatedPlatformCall(sessionId, platform, endpoint),
      ).rejects.toThrow("Invalid session");
    });

    it("should handle unlinked platform", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "masterworks";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: null,
          masterworks: null, // Not linked
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);

      await expect(
        makeAuthenticatedPlatformCall(sessionId, platform, endpoint),
      ).rejects.toThrow("Platform masterworks not linked or inactive");
    });

    it("should handle inactive platform", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "expired_token",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "expired", // Inactive status
          },
          masterworks: null,
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);

      await expect(
        makeAuthenticatedPlatformCall(sessionId, platform, endpoint),
      ).rejects.toThrow("Platform splint_invest not linked or inactive");
    });

    it("should handle 401 authentication errors", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "invalid_token",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
          },
          masterworks: null,
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);
      mockFetch.mockResolvedValue(mockFetchResponse({}, 401, false));

      await expect(
        makeAuthenticatedPlatformCall(sessionId, platform, endpoint),
      ).rejects.toThrow("Platform splint_invest authentication expired");

      // Should update platform link status to invalid
      expect(mockSessionManager.updateSessionPlatformLink).toHaveBeenCalledWith(
        sessionId,
        platform,
        expect.objectContaining({ status: "invalid" }),
      );
    });

    it("should handle other API errors", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "access_token_789",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
          },
          masterworks: null,
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);
      mockFetch.mockResolvedValue(mockFetchResponse({}, 500, false));

      await expect(
        makeAuthenticatedPlatformCall(sessionId, platform, endpoint),
      ).rejects.toThrow("Platform API call failed: Internal Server Error");
    });

    it("should update platform link activity after successful call", async () => {
      const sessionId = "session_123";
      const platform: PlatformType = "splint_invest";
      const endpoint = "/portfolio";

      const mockSession = {
        sessionId,
        luxUserId: "lux_user_123",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "access_token_789",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
          },
          masterworks: null,
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);
      mockFetch.mockResolvedValue(
        mockFetchResponse({ data: "success" }, 200, true),
      );

      await makeAuthenticatedPlatformCall(sessionId, platform, endpoint);

      // Should update both platform link activity and session
      expect(mockSessionManager.updateSessionPlatformLink).toHaveBeenCalledWith(
        sessionId,
        platform,
        expect.objectContaining({ lastUsedAt: expect.any(String) }),
      );
    });
  });

  describe("getAllUserPlatformLinks", () => {
    it("should retrieve all platform links for user", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLinks = {
        splint_invest: {
          platform: "splint_invest" as PlatformType,
          luxUserId,
          platformUserId: "splint_user_456",
          email: "test@example.com",
          name: "Test User",
          accessToken: "splint_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active",
        },
        masterworks: {
          platform: "masterworks" as PlatformType,
          luxUserId,
          platformUserId: "mw_user_789",
          email: "test@example.com",
          name: "Test User",
          accessToken: "mw_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active",
        },
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLinks.splint_invest))
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLinks.masterworks))
        .mockResolvedValueOnce(null); // realt not linked

      const result = await getAllUserPlatformLinks(luxUserId);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockPlatformLinks.splint_invest);
      expect(result).toContainEqual(mockPlatformLinks.masterworks);
    });

    it("should return empty array when no platforms linked", async () => {
      const luxUserId = "lux_user_123";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getAllUserPlatformLinks(luxUserId);

      expect(result).toEqual([]);
    });
  });

  describe("validateAllPlatformLinks", () => {
    it("should validate all platform links for user", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLink))
        .mockResolvedValueOnce(null) // masterworks not linked
        .mockResolvedValueOnce(null); // realt not linked

      mockFetch.mockResolvedValue(
        mockFetchResponse({ userId: "test" }, 200, true),
      );

      await validateAllPlatformLinks(luxUserId);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/splint_invest/auth/me",
        {
          headers: {
            Authorization: "Bearer access_token_789",
            "Content-Type": "application/json",
          },
        },
      );
    });

    it("should mark invalid links as expired for 401 errors", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "expired_token",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLink))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockFetch.mockResolvedValue(mockFetchResponse({}, 401, false));

      await validateAllPlatformLinks(luxUserId);

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        expect.any(Number),
        expect.stringContaining('"status":"expired"'),
      );
    });

    it("should mark invalid links as invalid for other errors", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLink))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockFetch.mockResolvedValue(mockFetchResponse({}, 500, false));

      await validateAllPlatformLinks(luxUserId);

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        expect.any(Number),
        expect.stringContaining('"status":"invalid"'),
      );
    });

    it("should reactivate inactive links that are now valid", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "expired", // Was expired but should be reactivated
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLink))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockFetch.mockResolvedValue(
        mockFetchResponse({ userId: "test" }, 200, true),
      );

      await validateAllPlatformLinks(luxUserId);

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        expect.any(Number),
        expect.stringContaining('"status":"active"'),
      );
    });

    it("should handle network errors gracefully", async () => {
      const luxUserId = "lux_user_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(mockPlatformLink))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockFetch.mockRejectedValue(new Error("Network error"));

      await validateAllPlatformLinks(luxUserId);

      expect(redis.setEx).toHaveBeenCalledWith(
        "platform_link:lux_user_123:splint_invest",
        expect.any(Number),
        expect.stringContaining('"status":"invalid"'),
      );
    });
  });
});
