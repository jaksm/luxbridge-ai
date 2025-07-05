import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerGetPortfolioTool } from "@/lib/tools/get-portfolio-tool";
import { createMockMCPServer } from "@/__tests__/fixtures/mockMCPServer";
import { mockEnvironmentVariables } from "@/__tests__/utils/testHelpers";
import { PlatformType } from "@/lib/types/platformAsset";

vi.mock("@/lib/auth/platform-auth");
vi.mock("@/lib/auth/session-manager");

describe("Get Portfolio Tool", () => {
  const mockPlatformAuth = vi.mocked(await import("@/lib/auth/platform-auth"));
  const mockSessionManager = vi.mocked(await import("@/lib/auth/session-manager"));

  const mockAccessToken = {
    userId: "lux_user_123",
    sessionId: "session_456",
    clientId: "client_789",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironmentVariables();
  });

  describe("Tool Registration", () => {
    it("should register get_portfolio tool", () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      expect(server.tool).toHaveBeenCalledWith(
        "get_portfolio",
        expect.stringContaining("Get your complete investment portfolio"),
        {},
        expect.any(Function)
      );
    });
  });

  describe("Empty Portfolio Scenarios", () => {
    it("should return empty portfolio when no platforms connected", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      // Mock no connected platforms
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(result.content[0].text).toContain("No platforms connected");
      expect(result.content[0].text).toContain('"totalValue": 0');
      expect(result.content[0].text).toContain('"platforms": 0');
      expect(result.content[0].text).toContain("generate_platform_auth_links");
    });

    it("should return empty portfolio when all platforms are inactive", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      // Mock inactive platform links
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: {
          platform: "splint_invest",
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
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(result.content[0].text).toContain("No platforms connected");
      expect(result.content[0].text).toContain('"totalValue": 0');
    });
  });

  describe("Single Platform Portfolio", () => {
    it("should retrieve portfolio from single connected platform", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      // Mock one active platform
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: {
          platform: "splint_invest",
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
      });

      // Mock portfolio data
      const mockPortfolio = {
        holdings: [
          {
            assetId: "WINE-BORDEAUX-001",
            name: "Bordeaux Wine 2020",
            currentValue: 1000,
            unrealizedGain: 50,
            gainPercentage: 5.26,
          },
          {
            assetId: "ART-CONTEMP-001",
            name: "Contemporary Art",
            currentValue: 500,
            unrealizedGain: -25,
            gainPercentage: -4.76,
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(mockPortfolio);

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(mockSessionManager.getUserConnectedPlatforms).toHaveBeenCalledWith(
        "lux_user_123",
        "session_456"
      );
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/portfolio"
      );

      expect(result.content[0].text).toContain('"totalValue": 1500');
      expect(result.content[0].text).toContain('"totalGain": 25');
      expect(result.content[0].text).toContain('"platforms": 1');
      expect(result.content[0].text).toContain('"totalHoldings": 2');
      expect(result.content[0].text).toContain("WINE-BORDEAUX-001");
      expect(result.content[0].text).toContain("ART-CONTEMP-001");
    });

    it("should handle platform API errors gracefully", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: {
          platform: "splint_invest",
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
      });

      // Mock API error
      mockPlatformAuth.makeAuthenticatedPlatformCall.mockRejectedValue(
        new Error("Platform API error")
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain("Failed to fetch portfolio");
      expect(result.content[0].text).toContain("Platform API error");
    });
  });

  describe("Multi-Platform Portfolio", () => {
    const createMockPlatformLink = (platform: PlatformType) => ({
      platform,
      luxUserId: "lux_user_123",
      platformUserId: `${platform}_user_456`,
      email: "test@example.com",
      name: "Test User",
      accessToken: `${platform}_token`,
      tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
      linkedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: "active" as const,
    });

    it("should aggregate portfolios from multiple platforms", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      // Mock multiple active platforms
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: createMockPlatformLink("realt"),
      });

      // Mock portfolio data for each platform
      const mockPortfolios = {
        splint_invest: {
          holdings: [
            {
              assetId: "WINE-001",
              name: "Bordeaux Wine",
              currentValue: 1000,
              unrealizedGain: 100,
              gainPercentage: 11.11,
            },
          ],
        },
        masterworks: {
          holdings: [
            {
              assetId: "ART-001",
              name: "Contemporary Art",
              currentValue: 2000,
              unrealizedGain: 200,
              gainPercentage: 11.11,
            },
          ],
        },
        realt: {
          holdings: [
            {
              assetId: "RE-001",
              name: "Detroit Property",
              currentValue: 1500,
              unrealizedGain: 50,
              gainPercentage: 3.45,
            },
          ],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          return Promise.resolve(mockPortfolios[platform as PlatformType]);
        }
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      // Verify all platforms were called
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).toHaveBeenCalledTimes(3);
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/portfolio"
      );
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).toHaveBeenCalledWith(
        "session_456",
        "masterworks",
        "/portfolio"
      );
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).toHaveBeenCalledWith(
        "session_456",
        "realt",
        "/portfolio"
      );

      // Verify aggregated totals
      expect(result.content[0].text).toContain('"totalValue": 4500'); // 1000 + 2000 + 1500
      expect(result.content[0].text).toContain('"totalGain": 350'); // 100 + 200 + 50
      expect(result.content[0].text).toContain('"platforms": 3');
      expect(result.content[0].text).toContain('"totalHoldings": 3');

      // Verify combined analytics are present
      expect(result.content[0].text).toContain('"combined"');
      expect(result.content[0].text).toContain('"topPlatform"');
      expect(result.content[0].text).toContain('"diversificationScore"');
      expect(result.content[0].text).toContain('"bestPerformer"');
      expect(result.content[0].text).toContain('"worstPerformer"');
    });

    it("should handle mixed success/error scenarios", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: null, // Not connected
      });

      // Mock one successful call and one error
      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          if (platform === "splint_invest") {
            return Promise.resolve({
              holdings: [
                {
                  assetId: "WINE-001",
                  name: "Bordeaux Wine",
                  currentValue: 1000,
                  unrealizedGain: 100,
                  gainPercentage: 11.11,
                },
              ],
            });
          } else {
            return Promise.reject(new Error("Masterworks API down"));
          }
        }
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      // Should include successful platform data
      expect(result.content[0].text).toContain('"totalValue": 1000');
      expect(result.content[0].text).toContain('"platforms": 2'); // 2 connected, even if one failed

      // Should include error status for failed platform
      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain("Masterworks API down");

      // Should still include successful platform data
      expect(result.content[0].text).toContain("WINE-001");
    });

    it("should calculate combined analytics correctly", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: null,
      });

      // Mock portfolios with different performance levels
      const mockPortfolios = {
        splint_invest: {
          holdings: [
            {
              assetId: "WINE-BEST",
              name: "Best Wine",
              currentValue: 1100,
              unrealizedGain: 100,
              gainPercentage: 10.0, // Best performing
            },
          ],
        },
        masterworks: {
          holdings: [
            {
              assetId: "ART-WORST",
              name: "Worst Art",
              currentValue: 950,
              unrealizedGain: -50,
              gainPercentage: -5.0, // Worst performing
            },
          ],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          return Promise.resolve(mockPortfolios[platform as PlatformType]);
        }
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      // Check combined analytics
      expect(result.content[0].text).toContain('"bestPerformer": "Best Wine"');
      expect(result.content[0].text).toContain('"worstPerformer": "Worst Art"');
      expect(result.content[0].text).toContain('"diversificationScore": 50'); // 2 platforms * 25
    });
  });

  describe("Session Handling", () => {
    it("should handle missing sessionId gracefully", async () => {
      const server = createMockMCPServer();
      const accessTokenWithoutSession = {
        ...mockAccessToken,
        sessionId: undefined,
      };
      registerGetPortfolioTool({ accessToken: accessTokenWithoutSession })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain("No active session found");
      expect(mockPlatformAuth.makeAuthenticatedPlatformCall).not.toHaveBeenCalled();
    });

    it("should handle getUserConnectedPlatforms errors", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockRejectedValue(
        new Error("Session manager error")
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      expect(result.content[0].text).toContain("Error retrieving portfolio");
      expect(result.content[0].text).toContain("Session manager error");
    });
  });

  describe("Performance Calculations", () => {
    it("should calculate gain percentages correctly", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      // Mock portfolio with specific values for calculation testing
      const mockPortfolio = {
        holdings: [
          {
            assetId: "TEST-001",
            name: "Test Asset",
            currentValue: 1100, // Current value
            unrealizedGain: 100, // Gain
            // Original investment = 1100 - 100 = 1000
            // Gain percentage = (100 / 1000) * 100 = 10%
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(mockPortfolio);

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      // Check that gain percentage is calculated correctly
      // Combined gain percentage = (100 / 1000) * 100 = 10%
      expect(result.content[0].text).toContain('"gainPercentage": 10');
    });

    it("should handle zero values in calculations", async () => {
      const server = createMockMCPServer();
      registerGetPortfolioTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      // Mock portfolio with zero values
      const mockPortfolio = {
        holdings: [
          {
            assetId: "ZERO-001",
            name: "Zero Asset",
            currentValue: 0,
            unrealizedGain: 0,
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(mockPortfolio);

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler();

      // Should handle zero values without errors
      expect(result.content[0].text).toContain('"totalValue": 0');
      expect(result.content[0].text).toContain('"totalGain": 0');
      expect(result.content[0].text).toContain('"gainPercentage": 0');
    });
  });

  function createMockPlatformLink(platform: PlatformType) {
    return {
      platform,
      luxUserId: "lux_user_123",
      platformUserId: `${platform}_user_456`,
      email: "test@example.com",
      name: "Test User",
      accessToken: `${platform}_token`,
      tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
      linkedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: "active" as const,
    };
  }
});