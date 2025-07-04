import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, OPTIONS } from "@/app/api/[platform]/assets/route";
import { createMockContext, expectJSONResponse, expectErrorResponse } from "@/__tests__/utils/testHelpers";
import { mockAssets } from "@/__tests__/fixtures/mockAssets";

vi.mock("@/lib/storage/redisClient");
vi.mock("@/lib/utils/semanticSearch");

describe("Platform Assets Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockURL = (platform: string, searchParams: Record<string, string> = {}) => {
    const url = new URL(`http://localhost:3000/api/${platform}/assets`);
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  };

  const createMockRequest = (platform: string, searchParams: Record<string, string> = {}) => ({
    url: createMockURL(platform, searchParams)
  } as any);

  describe("GET", () => {
    it("should return assets for platform", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest");
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.assets).toEqual(mockAssets.splint_invest);
      expect(data.total).toBe(mockAssets.splint_invest.length);
      expect(data.queryMetadata.filtersApplied.platform).toBe("splint_invest");
      expect(assetStorage.getAssetsByPlatform).toHaveBeenCalledWith({
        platform: "splint_invest",
        limit: 50
      });
    });

    it("should handle semantic search", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      const { SemanticAssetSearch } = await import("@/lib/utils/semanticSearch");
      
      const mockSearcher = {
        searchAssets: vi.fn().mockResolvedValue(["WINE-BORDEAUX-001", "WINE-BURGUNDY-002"])
      };
      vi.mocked(SemanticAssetSearch).mockImplementation(() => mockSearcher as any);
      vi.mocked(assetStorage.getAssetsByIds).mockResolvedValue(mockAssets.splint_invest.slice(0, 2));

      const request = createMockRequest("splint_invest", { semanticSearch: "fine wine" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(mockSearcher.searchAssets).toHaveBeenCalledWith({
        query: "fine wine",
        platform: "splint_invest",
        limit: 50,
        minScore: 0.1
      });
      expect(assetStorage.getAssetsByIds).toHaveBeenCalledWith(
        ["WINE-BORDEAUX-001", "WINE-BURGUNDY-002"],
        "splint_invest"
      );
      expect(data.queryMetadata.semanticQuery).toBe("fine wine");
    });

    it("should apply category filter", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      const wineAssets = mockAssets.splint_invest.filter(asset => asset.category === "wine");
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", { category: "wine" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.assets).toHaveLength(wineAssets.length);
      expect(data.queryMetadata.filtersApplied.category).toBe("wine");
    });

    it("should apply value range filters", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", { 
        minValue: "40000", 
        maxValue: "60000" 
      });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      data.assets.forEach((asset: any) => {
        expect(asset.valuation.currentValue).toBeGreaterThanOrEqual(40000);
        expect(asset.valuation.currentValue).toBeLessThanOrEqual(60000);
      });
      expect(data.queryMetadata.filtersApplied.minValue).toBe(40000);
      expect(data.queryMetadata.filtersApplied.maxValue).toBe(60000);
    });

    it("should apply risk category filter", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", { riskCategory: "moderate" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      data.assets.forEach((asset: any) => {
        expect(asset.expertAnalysis.riskProfile.riskCategory).toBe("moderate");
      });
      expect(data.queryMetadata.filtersApplied.riskCategory).toBe("moderate");
    });

    it("should respect limit parameter", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", { limit: "2" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.assets).toHaveLength(Math.min(2, mockAssets.splint_invest.length));
    });

    it("should enforce maximum limit", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", { limit: "500" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.assets.length).toBeLessThanOrEqual(200);
    });

    it("should validate platform parameter", async () => {
      const invalidPlatforms = ["invalid_platform", "", "blockchain"];

      for (const platform of invalidPlatforms) {
        const request = createMockRequest(platform);
        const context = createMockContext({ platform });

        const response = await GET(request, context);
        
        await expectErrorResponse(response, 400, "invalid_platform", "Invalid platform specified");
      }
    });

    it("should work for all valid platforms", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      const platforms = ["splint_invest", "masterworks", "realt"] as const;

      for (const platform of platforms) {
        vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets[platform]);

        const request = createMockRequest(platform);
        const context = createMockContext({ platform });

        const response = await GET(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data.assets).toEqual(mockAssets[platform]);
        expect(assetStorage.getAssetsByPlatform).toHaveBeenCalledWith({
          platform,
          limit: 50
        });
      }
    });

    it("should handle empty results", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue([]);

      const request = createMockRequest("splint_invest");
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.assets).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should handle storage errors", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockRejectedValue(new Error("Storage error"));

      const request = createMockRequest("splint_invest");
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      
      await expectErrorResponse(response, 500, "internal_error", "An unexpected error occurred");
    });

    it("should handle semantic search errors gracefully", async () => {
      const { SemanticAssetSearch } = await import("@/lib/utils/semanticSearch");
      
      const mockSearcher = {
        searchAssets: vi.fn().mockRejectedValue(new Error("Search error"))
      };
      vi.mocked(SemanticAssetSearch).mockImplementation(() => mockSearcher as any);

      const request = createMockRequest("splint_invest", { semanticSearch: "wine" });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      
      await expectErrorResponse(response, 500, "internal_error", "An unexpected error occurred");
    });

    it("should combine multiple filters", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest", {
        category: "wine",
        minValue: "40000",
        riskCategory: "moderate",
        limit: "10"
      });
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.queryMetadata.filtersApplied).toMatchObject({
        category: "wine",
        minValue: 40000,
        riskCategory: "moderate",
        platform: "splint_invest"
      });
    });

    it("should include search time metadata", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      
      vi.mocked(assetStorage.getAssetsByPlatform).mockResolvedValue(mockAssets.splint_invest);

      const request = createMockRequest("splint_invest");
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(typeof data.queryMetadata.searchTimeMs).toBe("number");
      expect(data.queryMetadata.searchTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("OPTIONS", () => {
    it("should return correct CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, OPTIONS");
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type, Authorization");
    });
  });
});
