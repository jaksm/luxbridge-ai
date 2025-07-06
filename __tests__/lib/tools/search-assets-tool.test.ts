import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerSearchAssetsTool } from "@/lib/tools/search-assets-tool";
import { createMockMCPServer } from "@/__tests__/fixtures/mockMCPServer";
import { mockEnvironmentVariables } from "@/__tests__/utils/testHelpers";
import { PlatformType } from "@/lib/types/platformAsset";

vi.mock("@/lib/auth/platform-auth");
vi.mock("@/lib/auth/session-manager");

describe("Search Assets Tool", () => {
  const mockPlatformAuth = vi.mocked(await import("@/lib/auth/platform-auth"));
  const mockSessionManager = vi.mocked(
    await import("@/lib/auth/session-manager"),
  );

  const mockAccessToken = {
    token: "mock_access_token",
    userId: "lux_user_123",
    sessionId: "session_456",
    clientId: "client_789",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironmentVariables();
  });

  describe("Tool Registration", () => {
    it("should register search_assets tool with correct schema", () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      expect(server.tool).toHaveBeenCalledWith(
        "search_assets",
        expect.stringContaining("Search for investment assets"),
        expect.objectContaining({
          query: expect.any(Object),
          platforms: expect.any(Object),
          maxResults: expect.any(Object),
        }),
        expect.any(Function),
      );
    });
  });

  describe("No Connected Platforms", () => {
    it("should return helpful message when no platforms connected", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine investments" });

      expect(result.content[0].text).toContain(
        'Search Results for "wine investments"',
      );
      expect(result.content[0].text).toContain('"totalResults": 0');
      expect(result.content[0].text).toContain('"platformsSearched": 0');
      expect(result.content[0].text).toContain("generate_platform_auth_links");
      expect(result.content[0].text).toContain(
        "Try different search terms once platforms are connected",
      );
    });

    it("should handle when requested platforms are not connected", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      // Mock only splint_invest connected, but user requests masterworks
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({
        query: "art investments",
        platforms: ["masterworks"],
      });

      expect(result.content[0].text).toContain('"totalResults": 0');
      expect(result.content[0].text).toContain('"platformsSearched": 0');
    });
  });

  describe("Single Platform Search", () => {
    it("should search single connected platform", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const mockSearchResults = {
        assets: [
          {
            assetId: "WINE-001",
            name: "Bordeaux Wine 2020",
            category: "Wine",
            expectedReturn: 8.5,
            price: 100,
          },
          {
            assetId: "WINE-002",
            name: "Burgundy Wine 2019",
            category: "Wine",
            expectedReturn: 7.2,
            price: 150,
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/assets/search?query=wine&limit=10",
      );

      expect(result.content[0].text).toContain('"totalResults": 2');
      expect(result.content[0].text).toContain('"platformsSearched": 1');
      expect(result.content[0].text).toContain("WINE-001");
      expect(result.content[0].text).toContain("Bordeaux Wine 2020");
      expect(result.content[0].text).toContain('"platform": "splint_invest"');
      expect(result.content[0].text).toContain(
        '"platformName": "Splint Invest"',
      );
    });

    it("should handle platform with no search results", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const mockSearchResults = { assets: [] };
      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "nonexistent" });

      expect(result.content[0].text).toContain('"totalResults": 0');
      expect(result.content[0].text).toContain('"status": "no_matches"');
    });

    it("should handle platform search errors", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockRejectedValue(
        new Error("Platform API error"),
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain(
        "Search failed: Error: Platform API error",
      );
    });
  });

  describe("Multi-Platform Search", () => {
    it("should search across multiple connected platforms", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: createMockPlatformLink("realt"),
      });

      const mockSearchResults = {
        splint_invest: {
          assets: [
            {
              assetId: "WINE-001",
              name: "Bordeaux Wine",
              category: "Wine",
              expectedReturn: 8.5,
            },
          ],
        },
        masterworks: {
          assets: [
            {
              assetId: "ART-001",
              name: "Picasso Painting",
              category: "Art",
              expectedReturn: 12.0,
            },
          ],
        },
        realt: {
          assets: [
            {
              assetId: "RE-001",
              name: "Detroit Property",
              category: "Real Estate",
              expectedReturn: 6.5,
            },
          ],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          return Promise.resolve(mockSearchResults[platform as PlatformType]);
        },
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "investment" });

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledTimes(3);
      expect(result.content[0].text).toContain('"totalResults": 3');
      expect(result.content[0].text).toContain('"platformsSearched": 3');

      // Check that all assets are included with platform attribution
      expect(result.content[0].text).toContain("WINE-001");
      expect(result.content[0].text).toContain("ART-001");
      expect(result.content[0].text).toContain("RE-001");
      expect(result.content[0].text).toContain('"platform": "splint_invest"');
      expect(result.content[0].text).toContain('"platform": "masterworks"');
      expect(result.content[0].text).toContain('"platform": "realt"');
    });

    it("should handle mixed success/error scenarios across platforms", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: null,
      });

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          if (platform === "splint_invest") {
            return Promise.resolve({
              assets: [
                {
                  assetId: "WINE-001",
                  name: "Bordeaux Wine",
                  expectedReturn: 8.5,
                },
              ],
            });
          } else {
            return Promise.reject(new Error("Masterworks API down"));
          }
        },
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "investment" });

      expect(result.content[0].text).toContain('"totalResults": 1');
      expect(result.content[0].text).toContain('"platformsSearched": 2');
      expect(result.content[0].text).toContain("WINE-001");
      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain("Masterworks API down");
    });

    it("should generate recommendations for multi-platform results", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: null,
      });

      const mockSearchResults = {
        splint_invest: {
          assets: [
            {
              assetId: "WINE-001",
              name: "Bordeaux Wine",
              category: "Wine",
              region: "France",
              expectedReturn: 8.5,
            },
            {
              assetId: "WINE-002",
              name: "Italian Wine",
              category: "Wine",
              region: "Italy",
              expectedReturn: 7.0,
            },
          ],
        },
        masterworks: {
          assets: [
            {
              assetId: "ART-001",
              name: "Picasso Painting",
              category: "Art",
              expectedReturn: 12.0, // Best performer
            },
          ],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          return Promise.resolve(mockSearchResults[platform as PlatformType]);
        },
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      // Check recommendations are included
      expect(result.content[0].text).toContain('"recommendations"');
      expect(result.content[0].text).toContain('"topMatches"');
      expect(result.content[0].text).toContain('"searchSuggestions"');

      // Top match should be highest performing asset (Picasso with 12% return)
      expect(result.content[0].text).toContain("Picasso Painting");

      // Should include search suggestions based on query and results
      expect(result.content[0].text).toContain("vintage bordeaux");
    });
  });

  describe("Platform Selection", () => {
    it("should search only specified platforms when provided", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: createMockPlatformLink("realt"),
      });

      const mockSearchResults = {
        assets: [
          {
            assetId: "ART-001",
            name: "Contemporary Art",
            expectedReturn: 10.0,
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({
        query: "art",
        platforms: ["masterworks"],
      });

      // Should only call masterworks API
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "masterworks",
        "/assets/search?query=art&limit=10",
      );

      expect(result.content[0].text).toContain('"platformsSearched": 1');
    });

    it("should filter platforms to only connected ones", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      // Only splint_invest connected
      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({
        query: "investment",
        platforms: ["splint_invest", "masterworks", "realt"], // Request all, but only splint_invest connected
      });

      // Should only search splint_invest since it's the only one connected
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        expect.any(String),
      );
    });
  });

  describe("Search Parameters", () => {
    it("should respect maxResults parameter", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      await toolHandler({ query: "wine", maxResults: 5 });

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/assets/search?query=wine&limit=5",
      );
    });

    it("should handle special characters in query", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      await toolHandler({ query: "wine & spirits" });

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/assets/search?query=wine%20%26%20spirits&limit=10",
      );
    });

    it("should use default maxResults when not specified", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      await toolHandler({ query: "wine" });

      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).toHaveBeenCalledWith(
        "session_456",
        "splint_invest",
        "/assets/search?query=wine&limit=10",
      );
    });
  });

  describe("Session Handling", () => {
    it("should handle missing sessionId gracefully", async () => {
      const server = createMockMCPServer();
      const accessTokenWithoutSession = {
        ...mockAccessToken,
        sessionId: undefined,
      };
      registerSearchAssetsTool({ accessToken: accessTokenWithoutSession })(
        server,
      );

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      expect(result.content[0].text).toContain('"status": "error"');
      expect(result.content[0].text).toContain("No active session found");
      expect(
        mockPlatformAuth.makeAuthenticatedPlatformCall,
      ).not.toHaveBeenCalled();
    });

    it("should handle getUserConnectedPlatforms errors", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockRejectedValue(
        new Error("Session manager error"),
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      expect(result.content[0].text).toContain("Error searching assets");
      expect(result.content[0].text).toContain("Session manager error");
    });
  });

  describe("Search Suggestions", () => {
    it("should generate contextual search suggestions for wine queries", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const mockSearchResults = {
        assets: [
          {
            assetId: "WINE-001",
            name: "Bordeaux Wine",
            category: "Wine",
            region: "France",
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine investments" });

      expect(result.content[0].text).toContain("vintage bordeaux");
      expect(result.content[0].text).toContain("french wine");
      expect(result.content[0].text).toContain("investment grade wine");
    });

    it("should generate suggestions based on asset categories and regions", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: createMockPlatformLink("masterworks"),
        realt: null,
      });

      const mockSearchResults = {
        splint_invest: {
          assets: [
            {
              assetId: "WINE-001",
              name: "Bordeaux Wine",
              category: "Vintage Wine",
              region: "Bordeaux",
            },
          ],
        },
        masterworks: {
          assets: [
            {
              assetId: "ART-001",
              name: "Modern Art",
              category: "Contemporary Art",
              region: "New York",
            },
          ],
        },
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockImplementation(
        (sessionId, platform, endpoint) => {
          return Promise.resolve(mockSearchResults[platform as PlatformType]);
        },
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "luxury assets" });

      expect(result.content[0].text).toContain(
        "Vintage Wine or Contemporary Art",
      );
      expect(result.content[0].text).toContain("Bordeaux or New York");
    });
  });

  describe("Performance and Analytics", () => {
    it("should sort top matches by performance metrics", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const mockSearchResults = {
        assets: [
          {
            assetId: "WINE-001",
            name: "Low Performer",
            expectedReturn: 5.0,
          },
          {
            assetId: "WINE-002",
            name: "High Performer",
            expectedReturn: 15.0,
          },
          {
            assetId: "WINE-003",
            name: "Medium Performer",
            expectedReturn: 10.0,
          },
        ],
      };

      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      // Top matches should be sorted by performance (highest first)
      const responseText = result.content[0].text;
      const highPerformerIndex = responseText.indexOf("High Performer");
      const mediumPerformerIndex = responseText.indexOf("Medium Performer");
      const lowPerformerIndex = responseText.indexOf("Low Performer");

      expect(highPerformerIndex).toBeLessThan(mediumPerformerIndex);
      expect(mediumPerformerIndex).toBeLessThan(lowPerformerIndex);
    });

    it("should track search performance metrics", async () => {
      const server = createMockMCPServer();
      registerSearchAssetsTool({ accessToken: mockAccessToken })(server);

      mockSessionManager.getUserConnectedPlatforms.mockResolvedValue({
        splint_invest: createMockPlatformLink("splint_invest"),
        masterworks: null,
        realt: null,
      });

      const mockSearchResults = { assets: [] };
      mockPlatformAuth.makeAuthenticatedPlatformCall.mockResolvedValue(
        mockSearchResults,
      );

      const [, , , toolHandler] = server.tool.mock.calls[0];
      const result = await toolHandler({ query: "wine" });

      expect(result.content[0].text).toContain('"searchTimeMs"');
      expect(result.content[0].text).toContain('"query": "wine"');
    });
  });

  function createMockPlatformLink(platform: PlatformType) {
    return {
      platform,
      luxUserId: "lux_user_123",
      platformUserId: `${platform}_user_456`,
      platformEmail: "test@example.com",
      accessToken: `${platform}_token`,
      tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
      linkedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      status: "active" as const,
    };
  }
});
