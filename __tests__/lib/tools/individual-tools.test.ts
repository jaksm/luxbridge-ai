import { createMockAsset } from "@/__tests__/fixtures/mockAssets";
import {
  mockPortfolioHoldings,
  mockUsers,
} from "@/__tests__/fixtures/mockUsers";
import { getUserById } from "@/lib/auth/authCommon";
import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { validatePrivyToken } from "@/lib/auth/privy-validation";
import {
  createAuthSession,
  getAuthSession,
  storeLuxBridgeUser,
} from "@/lib/auth/session-manager";
import { assetStorage } from "@/lib/storage/redisClient";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Import all tool registration functions
import { registerGeneratePlatformAuthLinksTool } from "@/lib/tools/generate-platform-auth-links-tool";
import { registerGetAssetTool } from "@/lib/tools/get-asset-tool";
import { registerGetAssetsByPlatformTool } from "@/lib/tools/get-assets-by-platform-tool";
import { registerGetLinkedPlatformsTool } from "@/lib/tools/get-linked-platforms-tool";
import { registerGetUserPortfolioCrossPlatformTool } from "@/lib/tools/get-user-portfolio-cross-platform-tool";
import { registerGetUserPortfolioTool } from "@/lib/tools/get-user-portfolio-tool";
import { registerListSupportedPlatformsTool } from "@/lib/tools/list-supported-platforms-tool";
import { registerSearchAssetsCrossPlatformTool } from "@/lib/tools/search-assets-cross-platform-tool";
import { registerSemanticSearchTool } from "@/lib/tools/semantic-search-tool";

// Mock all dependencies
vi.mock("@/lib/storage/redisClient");
vi.mock("@/lib/storage/pineconeClient");
vi.mock("@/lib/auth/authCommon");
vi.mock("@/lib/auth/privy-validation");
vi.mock("@/lib/auth/session-manager");
vi.mock("@/lib/auth/platform-auth");
vi.mock("@/lib/utils/portfolioCalculator");
vi.mock("@/lib/utils/semanticSearch");

describe("Individual MCP Tools", () => {
  let mockServer: any;
  let mockAccessToken: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = {
      token: "test_token",
      userId: "test_user_1",
      clientId: "test_client",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      sessionId: "session_123",
    };

    mockServer = {
      tool: vi.fn(),
    };
  });

  describe("registerGetAssetTool", () => {
    it("should register tool and handle successful asset retrieval", async () => {
      const mockAsset = createMockAsset();
      vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

      registerGetAssetTool({ accessToken: mockAccessToken })(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        "get_asset",
        expect.stringContaining("Retrieves a specific asset"),
        expect.any(Object),
        expect.any(Function)
      );

      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
        assetId: "test_asset",
      });

      expect(result.content[0].text).toContain(
        JSON.stringify(mockAsset, null, 2)
      );
    });

    it("should handle asset not found", async () => {
      vi.mocked(assetStorage.getAsset).mockResolvedValue(null);

      registerGetAssetTool({ accessToken: mockAccessToken })(mockServer);
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
        assetId: "nonexistent",
      });

      expect(result.content[0].text).toContain("Asset not found");
    });
  });

  describe("registerGetAssetsByPlatformTool", () => {
    it("should register tool and handle successful asset retrieval", async () => {
      const mockAssets = [createMockAsset()];
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets);

      registerGetAssetsByPlatformTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
        limit: 50,
      });

      expect(result.content[0].text).toContain(
        `Found ${mockAssets.length} assets`
      );
    });
  });

  describe("registerGetUserPortfolioTool", () => {
    it("should register tool and handle successful portfolio retrieval", async () => {
      const userWithPortfolio = {
        ...mockUsers[0],
        portfolios: {
          splint_invest: mockPortfolioHoldings.splint_invest,
          masterworks: [],
          realt: [],
        },
      };
      vi.mocked(getUserById).mockResolvedValue(userWithPortfolio);
      const mockConstructedAsset = {
        ...createMockAsset(),
        sharesOwned: 10,
        acquisitionPrice: 100,
        acquisitionDate: "2023-01-01",
        currentValue: 1000,
        unrealizedGain: 100,
      };
      vi.mocked(constructUserPortfolio).mockResolvedValue([mockConstructedAsset]);

      registerGetUserPortfolioTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
        userId: "test_user_1",
      });

      expect(result.content[0].text).toContain("Portfolio for test_user_1");
    });

    it("should handle user not found", async () => {
      vi.mocked(getUserById).mockResolvedValue(undefined);

      registerGetUserPortfolioTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
        userId: "nonexistent",
      });

      expect(result.content[0].text).toContain("User not found");
    });
  });

  describe("registerSemanticSearchTool", () => {
    it("should register tool and handle successful search", async () => {
      const mockSearchResults = ["asset1", "asset2"];
      const mockAssets = [createMockAsset()];
      const mockSemanticSearch = {
        searchAssets: vi.fn().mockResolvedValue(mockSearchResults),
      };
      vi.mocked(SemanticAssetSearch).mockImplementation(
        () => mockSemanticSearch as any
      );
      vi.mocked(assetStorage.getAssetsByIds).mockResolvedValue(mockAssets);

      registerSemanticSearchTool({ accessToken: mockAccessToken })(mockServer);
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        query: "test query",
        platform: "splint_invest",
      });

      expect(result.content[0].text).toContain("Found 1 assets matching");
    });

    it("should handle no search results", async () => {
      const mockSemanticSearch = {
        searchAssets: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(SemanticAssetSearch).mockImplementation(
        () => mockSemanticSearch as any
      );

      registerSemanticSearchTool({ accessToken: mockAccessToken })(mockServer);
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        query: "no results",
        platform: "splint_invest",
      });

      expect(result.content[0].text).toContain("No assets found matching");
    });
  });


  describe("registerListSupportedPlatformsTool", () => {
    it("should register tool and handle successful platform listing", async () => {
      const mockSession = {
        platforms: {
          splint_invest: {
            status: "active",
            lastUsedAt: new Date().toISOString(),
          },
          masterworks: null,
        },
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);

      registerListSupportedPlatformsTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({});

      expect(result.content[0].text).toContain("📋 Supported RWA Platforms");
    });

    it("should handle invalid session", async () => {
      vi.mocked(getAuthSession).mockResolvedValue(null);

      registerListSupportedPlatformsTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({});

      expect(result.content[0].text).toContain("❌ Invalid or expired session");
    });

    it("should handle missing sessionId in access token", async () => {
      const tokenWithoutSession = { ...mockAccessToken, sessionId: undefined };
      
      registerListSupportedPlatformsTool({ accessToken: tokenWithoutSession })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({});

      expect(result.content[0].text).toContain("❌ No active session found");
    });
  });

  describe("registerGeneratePlatformAuthLinksTool", () => {
    it("should register tool and generate auth links", async () => {
      const mockSession = {
        platforms: {},
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);

      registerGeneratePlatformAuthLinksTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platforms: ["splint_invest"],
      });

      expect(result.content[0].text).toContain(
        "🔗 Platform Authentication Links"
      );
    });
  });

  describe("registerGetLinkedPlatformsTool", () => {
    it("should register tool and show linked platforms", async () => {
      const mockSession = {
        platforms: {
          splint_invest: {
            status: "active",
            platformEmail: "test@platform.com",
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          },
        },
      };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);

      registerGetLinkedPlatformsTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({});

      expect(result.content[0].text).toContain("🔗 Linked Platform Accounts");
    });
  });

  describe("registerGetUserPortfolioCrossPlatformTool", () => {
    it("should register tool and retrieve cross-platform portfolio", async () => {
      const mockSession = {
        platforms: {
          splint_invest: {
            status: "active",
            platformUserId: "platform_user_123",
          },
        },
      };
      const mockPortfolio = { holdings: [{ assetId: "test", value: 1000 }] };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);
      vi.mocked(makeAuthenticatedPlatformCall).mockResolvedValue(mockPortfolio);

      registerGetUserPortfolioCrossPlatformTool({
        accessToken: mockAccessToken,
      })(mockServer);
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
      });

      expect(result.content[0].text).toContain(
        "📊 Portfolio from splint_invest"
      );
    });

    it("should handle inactive platform", async () => {
      const mockSession = {
        platforms: {
          splint_invest: {
            status: "expired",
          },
        },
      };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);

      registerGetUserPortfolioCrossPlatformTool({
        accessToken: mockAccessToken,
      })(mockServer);
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        platform: "splint_invest",
      });

      expect(result.content[0].text).toContain(
        "❌ Platform splint_invest not linked or inactive"
      );
    });
  });

  describe("registerSearchAssetsCrossPlatformTool", () => {
    it("should register tool and perform cross-platform search", async () => {
      const mockSession = {
        platforms: {
          splint_invest: { status: "active" },
          masterworks: { status: "active" },
        },
      };
      const mockSearchResponse = { assets: [createMockAsset()] };
      vi.mocked(getAuthSession).mockResolvedValue(mockSession as any);
      vi.mocked(makeAuthenticatedPlatformCall).mockResolvedValue(
        mockSearchResponse
      );

      registerSearchAssetsCrossPlatformTool({ accessToken: mockAccessToken })(
        mockServer
      );
      const toolHandler = mockServer.tool.mock.calls[0][3];
      const result = await toolHandler({
        semanticQuery: "luxury investments",
        platforms: ["splint_invest", "masterworks"],
      });

      expect(result.content[0].text).toContain(
        "🔍 Cross-platform search results"
      );
    });
  });
});
