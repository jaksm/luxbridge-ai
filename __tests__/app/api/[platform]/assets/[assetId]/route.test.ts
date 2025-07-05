import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, OPTIONS } from "@/app/api/[platform]/assets/[assetId]/route";
import {
  createMockContext,
  expectJSONResponse,
  expectErrorResponse,
} from "@/__tests__/utils/testHelpers";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";

vi.mock("@/lib/storage/redisClient");

describe("Platform Asset by ID Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = () => ({}) as any;

  describe("GET", () => {
    it("should return asset when found", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      const mockAsset = createMockAsset();

      vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

      const request = createMockRequest();
      const context = createMockContext({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001",
      });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data).toEqual(mockAsset);
      expect(assetStorage.getAsset).toHaveBeenCalledWith({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001",
      });
    });

    it("should return 404 when asset not found", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");

      vi.mocked(assetStorage.getAsset).mockResolvedValue(null);

      const request = createMockRequest();
      const context = createMockContext({
        platform: "splint_invest",
        assetId: "NONEXISTENT",
      });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        404,
        "asset_not_found",
        "Asset not found",
      );
    });

    it("should validate platform parameter", async () => {
      const invalidPlatforms = ["invalid_platform", "", "blockchain"];

      for (const platform of invalidPlatforms) {
        const request = createMockRequest();
        const context = createMockContext({
          platform,
          assetId: "WINE-BORDEAUX-001",
        });

        const response = await GET(request, context);

        await expectErrorResponse(
          response,
          400,
          "invalid_platform",
          "Invalid platform specified",
        );
      }
    });

    it("should work for all valid platforms", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      const mockAsset = createMockAsset();

      vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

      const platforms = ["splint_invest", "masterworks", "realt"];
      const assetId = "TEST-ASSET-001";

      for (const platform of platforms) {
        const request = createMockRequest();
        const context = createMockContext({ platform, assetId });

        const response = await GET(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data).toEqual(mockAsset);
        expect(assetStorage.getAsset).toHaveBeenCalledWith({
          platform,
          assetId,
        });
      }
    });

    it("should handle different asset types", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");

      const assetTypes = [
        { id: "WINE-BORDEAUX-001", category: "wine" },
        { id: "ART-MODERN-001", category: "art" },
        { id: "RE-RESIDENTIAL-001", category: "real_estate" },
      ];

      for (const { id, category } of assetTypes) {
        const mockAsset = createMockAsset({ assetId: id, category });
        vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

        const request = createMockRequest();
        const context = createMockContext({
          platform: "splint_invest",
          assetId: id,
        });

        const response = await GET(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data.assetId).toBe(id);
        expect(data.category).toBe(category);
      }
    });

    it("should handle storage errors", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");

      vi.mocked(assetStorage.getAsset).mockRejectedValue(
        new Error("Storage error"),
      );

      const request = createMockRequest();
      const context = createMockContext({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001",
      });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    });

    it("should handle special characters in asset ID", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");

      vi.mocked(assetStorage.getAsset).mockResolvedValue(null);

      const specialAssetIds = [
        "ASSET-WITH-DASHES",
        "ASSET_WITH_UNDERSCORES",
        "ASSET.WITH.DOTS",
        "ASSET%20WITH%20ENCODING",
      ];

      for (const assetId of specialAssetIds) {
        const request = createMockRequest();
        const context = createMockContext({
          platform: "splint_invest",
          assetId,
        });

        const response = await GET(request, context);

        await expectErrorResponse(
          response,
          404,
          "asset_not_found",
          "Asset not found",
        );
        expect(assetStorage.getAsset).toHaveBeenCalledWith({
          platform: "splint_invest",
          assetId,
        });
      }
    });

    it("should handle empty asset ID", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");

      vi.mocked(assetStorage.getAsset).mockResolvedValue(null);

      const request = createMockRequest();
      const context = createMockContext({
        platform: "splint_invest",
        assetId: "",
      });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        404,
        "asset_not_found",
        "Asset not found",
      );
    });

    it("should return complete asset data structure", async () => {
      const { assetStorage } = await import("@/lib/storage/redisClient");
      const mockAsset = createMockAsset();

      vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

      const request = createMockRequest();
      const context = createMockContext({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001",
      });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      // Verify complete asset structure
      expect(data).toHaveProperty("assetId");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("category");
      expect(data).toHaveProperty("valuation");
      expect(data).toHaveProperty("expertAnalysis");
      expect(data).toHaveProperty("physicalAttributes");
      expect(data).toHaveProperty("metadata");

      // Verify nested structures
      expect(data.valuation).toHaveProperty("currentValue");
      expect(data.valuation).toHaveProperty("sharePrice");
      expect(data.expertAnalysis).toHaveProperty("investmentHorizon");
      expect(data.expertAnalysis).toHaveProperty("riskProfile");
      expect(data.expertAnalysis).toHaveProperty("yieldProjections");
      expect(data.expertAnalysis).toHaveProperty("expertProfile");
    });
  });

  describe("OPTIONS", () => {
    it("should return correct CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, OPTIONS",
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
    });
  });
});
