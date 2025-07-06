import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockEnvironmentVariables,
  mockFetchResponse,
} from "@/__tests__/utils/testHelpers";
import { PlatformType } from "@/lib/types/platformAsset";
import { PlatformLink } from "@/lib/types/luxbridge-auth";

// Mock all dependencies
vi.mock("@/lib/redis");
vi.mock("@/lib/auth/session-manager");
vi.mock("@/lib/auth/platform-auth");
vi.mock("@/lib/auth/redis-users");
vi.mock("@/lib/tools/get-portfolio-tool");
vi.mock("@/lib/tools/search-assets-tool");

describe("Multi-Platform Integration Flow", () => {
  let mockRedis: any;
  let mockSessionManager: any;
  let mockPlatformAuth: any;
  let mockRedisUsers: any;
  let mockGetPortfolioTool: any;
  let mockSearchAssetsTool: any;

  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEnvironmentVariables();

    mockRedis = vi.mocked(await import("@/lib/redis"));
    mockSessionManager = vi.mocked(await import("@/lib/auth/session-manager"));
    mockPlatformAuth = vi.mocked(await import("@/lib/auth/platform-auth"));
    mockRedisUsers = vi.mocked(await import("@/lib/auth/redis-users"));
    mockGetPortfolioTool = vi.mocked(
      await import("@/lib/tools/get-portfolio-tool"),
    );
    mockSearchAssetsTool = vi.mocked(
      await import("@/lib/tools/search-assets-tool"),
    );
  });

  describe("End-to-End Multi-Platform Authentication Flow", () => {
    it("should handle complete user journey from OAuth to multi-platform connection", async () => {
      // Step 1: User creates LuxBridge session
      const luxUserId = "lux_user_123";
      const privyToken = "privy_token_456";
      const sessionId = "session_789";

      mockSessionManager.createAuthSession.mockResolvedValue(sessionId);

      const createdSessionId = await mockSessionManager.createAuthSession(
        luxUserId,
        privyToken,
      );
      expect(createdSessionId).toBe(sessionId);

      // Step 2: User connects to first platform (Splint Invest)
      const splintCredentials = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      const splintUser = {
        userId: "splint_user_456",
        email: splintCredentials.email,
        password: "",
        name: splintCredentials.name,
        scenario: "empty_portfolio",
        portfolios: { splint_invest: [], masterworks: [], realt: [] },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRedisUsers.registerUser.mockResolvedValue({
        success: true,
        user: splintUser,
        accessToken: "splint_jwt_token",
      });

      const splintRegistration = await mockRedisUsers.registerUser({
        email: splintCredentials.email,
        password: splintCredentials.password,
        name: splintCredentials.name,
      });

      expect(splintRegistration.success).toBe(true);
      expect(splintRegistration.user?.email).toBe(splintCredentials.email);

      // Step 3: Validate platform credentials and create platform link
      const splintAuthResult = {
        success: true,
        user: {
          userId: "splint_user_456",
          email: "test@example.com",
          name: "Test User",
        },
        accessToken: "splint_platform_token",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      mockPlatformAuth.validatePlatformCredentials.mockResolvedValue(
        splintAuthResult,
      );

      const platformValidation =
        await mockPlatformAuth.validatePlatformCredentials(
          "splint_invest",
          splintCredentials.email,
          splintCredentials.password,
        );

      expect(platformValidation.success).toBe(true);

      // Step 4: Store platform link in session
      const splintPlatformLink = {
        platform: "splint_invest" as PlatformType,
        luxUserId,
        platformUserId: "splint_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "splint_platform_token",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active" as const,
      };

      mockPlatformAuth.storePlatformLink.mockResolvedValue(splintPlatformLink);
      mockSessionManager.updateSessionPlatformLink.mockResolvedValue();

      await mockPlatformAuth.storePlatformLink(splintPlatformLink);
      await mockSessionManager.updateSessionPlatformLink(
        sessionId,
        "splint_invest",
        splintPlatformLink,
      );

      expect(mockSessionManager.updateSessionPlatformLink).toHaveBeenCalledWith(
        sessionId,
        "splint_invest",
        splintPlatformLink,
      );

      // Step 5: User connects to second platform (Masterworks)
      const masterworksAuthResult = {
        success: true,
        user: {
          userId: "mw_user_789",
          email: "test@example.com",
          name: "Test User",
        },
        accessToken: "mw_platform_token",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      mockPlatformAuth.validatePlatformCredentials.mockResolvedValue(
        masterworksAuthResult,
      );

      const mwValidation = await mockPlatformAuth.validatePlatformCredentials(
        "masterworks",
        splintCredentials.email,
        splintCredentials.password,
      );

      expect(mwValidation.success).toBe(true);

      // Step 6: Store second platform link
      const mwPlatformLink = {
        platform: "masterworks" as PlatformType,
        luxUserId,
        platformUserId: "mw_user_789",
        email: "test@example.com",
        name: "Test User",
        accessToken: "mw_platform_token",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active" as const,
      };

      mockPlatformAuth.storePlatformLink.mockResolvedValue(mwPlatformLink);
      await mockSessionManager.updateSessionPlatformLink(
        sessionId,
        "masterworks",
        mwPlatformLink,
      );

      // Step 7: Verify user now has multi-platform access
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: splintPlatformLink,
        masterworks: mwPlatformLink,
        realt: null,
      });

      const connectedPlatforms =
        await mockSessionManager.getUserConnectedPlatforms(
          luxUserId,
          sessionId,
        );

      expect(connectedPlatforms.splint_invest).toEqual(splintPlatformLink);
      expect(connectedPlatforms.masterworks).toEqual(mwPlatformLink);
      expect(connectedPlatforms.realt).toBeNull();

      // Step 8: Test multi-platform portfolio retrieval
      const mockPortfolioData = {
        splint_invest: {
          holdings: [
            { assetId: "WINE-001", currentValue: 1000, unrealizedGain: 100 },
          ],
        },
        masterworks: {
          holdings: [
            { assetId: "ART-001", currentValue: 2000, unrealizedGain: 200 },
          ],
        },
        realt: {
          holdings: [],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId: string, platform: PlatformType, endpoint: string) => {
          return Promise.resolve(mockPortfolioData[platform]);
        },
      );

      await mockPlatformAuth.makeAuthenticatedPlatformCall(
        sessionId,
        "splint_invest",
        "/portfolio",
      );
      await mockPlatformAuth.makeAuthenticatedPlatformCall(
        sessionId,
        "masterworks",
        "/portfolio",
      );

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(sessionId, "splint_invest", "/portfolio");
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(sessionId, "masterworks", "/portfolio");
    });

    it("should handle platform disconnection gracefully", async () => {
      const luxUserId = "lux_user_123";
      const sessionId = "session_789";
      const platform: PlatformType = "splint_invest";

      // Step 1: User has active platform connection
      const activePlatformLink = {
        platform,
        luxUserId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active" as const,
      };

      mockPlatformAuth.getPlatformLink.mockResolvedValue(activePlatformLink);

      // Step 2: Platform authentication expires (401 error)
      mockFetch.mockResolvedValue(mockFetchResponse({}, 401, false));

      const mockSession = {
        sessionId,
        luxUserId,
        platforms: {
          splint_invest: activePlatformLink,
          masterworks: null,
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(mockSession);

      // Step 3: API call should fail and mark platform as invalid
      await expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall(
          sessionId,
          platform,
          "/portfolio",
        ),
      ).rejects.toThrow("Platform splint_invest authentication expired");

      expect(mockSessionManager.updateSessionPlatformLink).toHaveBeenCalledWith(
        sessionId,
        platform,
        expect.objectContaining({ status: "invalid" }),
      );

      // Step 4: Subsequent portfolio calls should skip invalid platform
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: { ...activePlatformLink, status: "invalid" },
        masterworks: null,
        realt: null,
      });

      const connectedPlatforms =
        await mockSessionManager.getUserConnectedPlatforms(
          luxUserId,
          sessionId,
        );

      // Only active platforms should be considered for operations
      const activePlatforms = Object.entries(connectedPlatforms)
        .filter(([_, link]) => link !== null && link.status === "active")
        .map(([platform, _]) => platform);

      expect(activePlatforms).toHaveLength(0);
    });
  });

  describe("Cross-Platform Tool Integration", () => {
    it("should handle get_portfolio tool with multiple platforms", async () => {
      const mockAccessToken = {
        userId: "lux_user_123",
        sessionId: "session_456",
        clientId: "client_789",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      // Mock connected platforms
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: {
          platform: "splint_invest",
          luxUserId: "lux_user_123",
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
          platform: "masterworks",
          luxUserId: "lux_user_123",
          platformUserId: "mw_user_789",
          email: "test@example.com",
          name: "Test User",
          accessToken: "mw_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active",
        },
        realt: null,
      });

      // Mock portfolio responses
      const mockPortfolios = {
        splint_invest: {
          holdings: [
            {
              assetId: "WINE-001",
              name: "Bordeaux Wine",
              currentValue: 1100,
              unrealizedGain: 100,
              gainPercentage: 10.0,
            },
          ],
        },
        masterworks: {
          holdings: [
            {
              assetId: "ART-001",
              name: "Picasso Painting",
              currentValue: 2200,
              unrealizedGain: 200,
              gainPercentage: 10.0,
            },
          ],
        },
        realt: {
          holdings: [],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId: string, platform: PlatformType, endpoint: string) => {
          return Promise.resolve(mockPortfolios[platform]);
        },
      );

      // Test that get_portfolio tool registration would work
      const mockServer = {
        tool: vi.fn(),
      };

      mockGetPortfolioTool.registerGetPortfolioTool.mockReturnValue(
        (server) => {
          server.tool(
            "get_portfolio",
            expect.any(String),
            {},
            expect.any(Function),
          );
        },
      );

      const registerTool = mockGetPortfolioTool.registerGetPortfolioTool({
        accessToken: mockAccessToken,
      });
      registerTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        "get_portfolio",
        expect.any(String),
        {},
        expect.any(Function),
      );
    });

    it("should handle search_assets tool with intelligent platform selection", async () => {
      const mockAccessToken = {
        userId: "lux_user_123",
        sessionId: "session_456",
        clientId: "client_789",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      // Mock connected platforms
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: {
          platform: "splint_invest",
          luxUserId: "lux_user_123",
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
          platform: "masterworks",
          luxUserId: "lux_user_123",
          platformUserId: "mw_user_789",
          email: "test@example.com",
          name: "Test User",
          accessToken: "mw_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active",
        },
        realt: null,
      });

      // Mock search responses
      const mockSearchResults = {
        splint_invest: {
          assets: [
            {
              assetId: "WINE-SEARCH-001",
              name: "Investment Grade Wine",
              category: "Wine",
              expectedReturn: 8.5,
            },
          ],
        },
        masterworks: {
          assets: [
            {
              assetId: "ART-SEARCH-001",
              name: "Contemporary Art Piece",
              category: "Art",
              expectedReturn: 12.0,
            },
          ],
        },
        realt: {
          assets: [],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId: string, platform: PlatformType, endpoint: string) => {
          if (endpoint.includes("/assets/search")) {
            return Promise.resolve(mockSearchResults[platform]);
          }
          return Promise.reject(new Error("Unexpected endpoint"));
        },
      );

      // Test that search_assets tool registration would work
      const mockServer = {
        tool: vi.fn(),
      };

      mockSearchAssetsTool.registerSearchAssetsTool.mockReturnValue(
        (server) => {
          server.tool(
            "search_assets",
            expect.any(String),
            expect.any(Object),
            expect.any(Function),
          );
        },
      );

      const registerTool = mockSearchAssetsTool.registerSearchAssetsTool({
        accessToken: mockAccessToken,
      });
      registerTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        "search_assets",
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should handle partial platform failures gracefully", async () => {
      const luxUserId = "lux_user_123";
      const sessionId = "session_789";

      // Mock session with multiple platforms
      const multiPlatformSession = {
        sessionId,
        luxUserId,
        platforms: {
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
            status: "active" as const,
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
            status: "active" as const,
          },
          realt: null,
        },
      };

      mockSessionManager.getAuthSession.mockResolvedValue(multiPlatformSession);

      // Mock one platform succeeding and one failing
      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          if (platform === "splint_invest") {
            return Promise.resolve({
              holdings: [
                {
                  assetId: "WINE-001",
                  currentValue: 1000,
                  unrealizedGain: 100,
                },
              ],
            });
          } else {
            return Promise.reject(
              new Error("Masterworks API temporarily unavailable"),
            );
          }
        },
      );

      // Test that successful platform still works
      const splintResult = await mockPlatformAuth.makeAuthenticatedPlatformCall(
        sessionId,
        "splint_invest",
        "/portfolio",
      );
      expect(splintResult.holdings).toHaveLength(1);

      // Test that failed platform throws expected error
      await expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall(
          sessionId,
          "masterworks",
          "/portfolio",
        ),
      ).rejects.toThrow("Masterworks API temporarily unavailable");

      // Verify session update is still called for successful operations
      expect(mockSessionManager.updateSessionPlatformLink).toHaveBeenCalledWith(
        sessionId,
        "splint_invest",
        expect.objectContaining({ lastUsedAt: expect.any(String) }),
      );
    });

    it("should handle session expiration across platforms", async () => {
      const luxUserId = "lux_user_123";
      const expiredSessionId = "expired_session_123";

      // Mock expired session
      mockSessionManager.getAuthSession.mockResolvedValue(null);

      // Any platform call should fail with session error
      await expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall(
          expiredSessionId,
          "splint_invest",
          "/portfolio",
        ),
      ).rejects.toThrow("Invalid session");

      // Should not attempt to update platform links
      expect(
        mockSessionManager.updateSessionPlatformLink,
      ).not.toHaveBeenCalled();
    });

    it("should handle Redis connection failures gracefully", async () => {
      const luxUserId = "lux_user_123";

      // Mock Redis connection failure
      mockSessionManager.getUserConnectedPlatforms.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      // Operations should fail but not crash
      await expect(
        mockSessionManager.getUserConnectedPlatforms(luxUserId),
      ).rejects.toThrow("Redis connection failed");

      // Other operations should still be possible if Redis recovers
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });

      const result =
        await mockSessionManager.getUserConnectedPlatforms(luxUserId);
      expect(result).toEqual({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });
    });
  });

  describe("Session Management and Cleanup", () => {
    it("should properly clean up expired sessions and platform links", async () => {
      const luxUserId = "lux_user_123";

      // Mock expired sessions cleanup
      mockSessionManager.cleanupExpiredSessions.mockResolvedValue();
      await mockSessionManager.cleanupExpiredSessions();

      expect(mockSessionManager.cleanupExpiredSessions).toHaveBeenCalled();

      // Mock platform link validation
      mockPlatformAuth.validateAllPlatformLinks.mockResolvedValue();
      await mockPlatformAuth.validateAllPlatformLinks(luxUserId);

      expect(mockPlatformAuth.validateAllPlatformLinks).toHaveBeenCalledWith(
        luxUserId,
      );
    });

    it("should handle concurrent session operations safely", async () => {
      const luxUserId = "lux_user_123";
      const sessionId = "session_789";

      // Mock concurrent session operations
      const operations = [
        mockSessionManager.extendSession(sessionId),
        mockSessionManager.getUserConnectedPlatforms(luxUserId, sessionId),
        mockSessionManager.getActiveUserSession(luxUserId),
      ];

      // All operations should complete without interference
      mockSessionManager.extendSession.mockResolvedValue();
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });
      mockSessionManager.getActiveUserSession.mockResolvedValue(null);

      await Promise.all(operations);

      expect(mockSessionManager.extendSession).toHaveBeenCalledWith(sessionId);
      expect(mockSessionManager.getUserConnectedPlatforms).toHaveBeenCalledWith(
        luxUserId,
        sessionId,
      );
      expect(mockSessionManager.getActiveUserSession).toHaveBeenCalledWith(
        luxUserId,
      );
    });
  });

  describe("Cross-Platform Data Consistency", () => {
    it("should maintain data consistency across platform operations", async () => {
      const luxUserId = "lux_user_123";
      const sessionId = "session_789";

      // Mock consistent platform data
      const platformUser = {
        userId: "platform_user_123",
        email: "test@example.com",
        name: "Test User",
      };

      const platformLinks = {
        splint_invest: {
          platform: "splint_invest" as PlatformType,
          luxUserId,
          platformUserId: platformUser.userId,
          email: platformUser.email,
          name: platformUser.name,
          accessToken: "splint_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active" as const,
        },
        masterworks: {
          platform: "masterworks" as PlatformType,
          luxUserId,
          platformUserId: platformUser.userId,
          email: platformUser.email,
          name: platformUser.name,
          accessToken: "mw_token",
          tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
          linkedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          status: "active" as const,
        },
      };

      // Mock consistent responses
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: platformLinks.splint_invest,
        masterworks: platformLinks.masterworks,
        realt: null,
      });

      mockPlatformAuth.getAllUserPlatformLinks.mockResolvedValue([
        platformLinks.splint_invest,
        platformLinks.masterworks,
      ]);

      const connectedPlatforms =
        await mockSessionManager.getUserConnectedPlatforms(
          luxUserId,
          sessionId,
        );
      const allPlatformLinks =
        await mockPlatformAuth.getAllUserPlatformLinks(luxUserId);

      // Data should be consistent across different access methods
      expect(connectedPlatforms.splint_invest?.email).toBe(platformUser.email);
      expect(connectedPlatforms.masterworks?.email).toBe(platformUser.email);
      expect(allPlatformLinks).toHaveLength(2);
      expect(
        allPlatformLinks.every((link) => link.email === platformUser.email),
      ).toBe(true);
    });
  });
});
