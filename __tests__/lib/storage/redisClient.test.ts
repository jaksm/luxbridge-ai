import { describe, it, expect, beforeEach, vi } from "vitest";
import { AssetStorage } from "@/lib/storage/redisClient";
import { mockRedisClient } from "@/__tests__/setup";
import { createMockAsset, mockAssets } from "@/__tests__/fixtures/mockAssets";
import { mockPortfolioHoldings } from "@/__tests__/fixtures/mockUsers";
import { PlatformType } from "@/lib/types/platformAsset";

describe("AssetStorage", () => {
  let assetStorage: AssetStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    assetStorage = new AssetStorage();
  });

  describe("getAsset", () => {
    it("should return asset when found", async () => {
      const mockAsset = createMockAsset();
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockAsset));

      const result = await assetStorage.getAsset({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001"
      });

      expect(result).toEqual(mockAsset);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001"
      );
    });

    it("should return null when asset not found", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await assetStorage.getAsset({
        platform: "splint_invest",
        assetId: "NONEXISTENT"
      });

      expect(result).toBeNull();
    });

    it("should handle Redis errors", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis connection failed"));

      await expect(assetStorage.getAsset({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001"
      })).rejects.toThrow("Redis connection failed");
    });
  });

  describe("getAssetsByPlatform", () => {
    it("should return assets for platform", async () => {
      const assets = mockAssets.splint_invest;
      const keys = assets.map((_, i) => `platform:splint_invest:assets:asset-${i}`);
      const values = assets.map(asset => JSON.stringify(asset));

      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50
      });

      expect(result).toEqual(assets);
      expect(mockRedisClient.keys).toHaveBeenCalledWith("platform:splint_invest:assets:*");
      expect(mockRedisClient.mGet).toHaveBeenCalledWith(keys);
    });

    it("should return empty array when no assets found", async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50
      });

      expect(result).toEqual([]);
      expect(mockRedisClient.mGet).not.toHaveBeenCalled();
    });

    it("should respect limit parameter", async () => {
      const assets = Array.from({ length: 10 }, (_, i) => 
        createMockAsset({ assetId: `ASSET-${i}` })
      );
      const keys = assets.map((_, i) => `platform:splint_invest:assets:asset-${i}`);
      const values = assets.map(asset => JSON.stringify(asset));

      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 5
      });

      expect(result).toHaveLength(5);
    });

    it("should handle null values in mGet response", async () => {
      const keys = ["key1", "key2", "key3"];
      const values = [JSON.stringify(createMockAsset()), null, JSON.stringify(createMockAsset())];

      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("storeAsset", () => {
    it("should store asset successfully", async () => {
      const mockAsset = createMockAsset();
      mockRedisClient.set.mockResolvedValue("OK");

      await assetStorage.storeAsset(mockAsset, "splint_invest");

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001",
        JSON.stringify(mockAsset)
      );
    });

    it("should handle storage errors", async () => {
      const mockAsset = createMockAsset();
      mockRedisClient.set.mockRejectedValue(new Error("Storage failed"));

      await expect(assetStorage.storeAsset(mockAsset, "splint_invest"))
        .rejects.toThrow("Storage failed");
    });
  });

  describe("getUserPortfolio", () => {
    it("should return user portfolio when found", async () => {
      const portfolio = mockPortfolioHoldings.splint_invest;
      mockRedisClient.get.mockResolvedValue(JSON.stringify(portfolio));

      const result = await assetStorage.getUserPortfolio({
        platform: "splint_invest",
        userId: "test_user_1"
      });

      expect(result).toEqual(portfolio);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "platform:splint_invest:users:test_user_1:portfolio"
      );
    });

    it("should return empty array when portfolio not found", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await assetStorage.getUserPortfolio({
        platform: "splint_invest",
        userId: "test_user_1"
      });

      expect(result).toEqual([]);
    });
  });

  describe("storeUserPortfolio", () => {
    it("should store user portfolio successfully", async () => {
      const portfolio = mockPortfolioHoldings.splint_invest;
      mockRedisClient.set.mockResolvedValue("OK");

      await assetStorage.storeUserPortfolio("test_user_1", "splint_invest", portfolio);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "platform:splint_invest:users:test_user_1:portfolio",
        JSON.stringify(portfolio)
      );
    });
  });

  describe("getPlatformInfo", () => {
    it("should return platform info when found", async () => {
      const platformInfo = {
        platform: "splint_invest" as PlatformType,
        name: "Splint Invest",
        description: "Fractional investment platform",
        totalAssets: 100,
        totalValue: 1000000,
        assetCategories: [],
        supportedFeatures: [],
        lastUpdated: "2024-01-01T00:00:00Z"
      };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(platformInfo));

      const result = await assetStorage.getPlatformInfo("splint_invest");

      expect(result).toEqual(platformInfo);
      expect(mockRedisClient.get).toHaveBeenCalledWith("platform:splint_invest:info");
    });

    it("should return null when platform info not found", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await assetStorage.getPlatformInfo("splint_invest");

      expect(result).toBeNull();
    });
  });

  describe("getAssetsByIds", () => {
    it("should return assets for given IDs", async () => {
      const assets = [createMockAsset(), createMockAsset({ assetId: "ASSET-2" })];
      const assetIds = ["ASSET-1", "ASSET-2"];
      const values = assets.map(asset => JSON.stringify(asset));

      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await assetStorage.getAssetsByIds(assetIds, "splint_invest");

      expect(result).toEqual(assets);
      expect(mockRedisClient.mGet).toHaveBeenCalledWith([
        "platform:splint_invest:assets:ASSET-1",
        "platform:splint_invest:assets:ASSET-2"
      ]);
    });

    it("should handle missing assets in batch", async () => {
      const asset = createMockAsset();
      const assetIds = ["ASSET-1", "MISSING"];
      const values = [JSON.stringify(asset), null];

      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await assetStorage.getAssetsByIds(assetIds, "splint_invest");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(asset);
    });
  });

  describe("deleteAsset", () => {
    it("should delete asset successfully", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await assetStorage.deleteAsset("WINE-BORDEAUX-001", "splint_invest");

      expect(mockRedisClient.del).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001"
      );
    });
  });

  describe("getAllPlatformAssetIds", () => {
    it("should return all asset IDs for platform", async () => {
      const keys = [
        "platform:splint_invest:assets:ASSET-1",
        "platform:splint_invest:assets:ASSET-2",
        "platform:splint_invest:assets:ASSET-3"
      ];
      
      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await assetStorage.getAllPlatformAssetIds("splint_invest");

      expect(result).toEqual(["ASSET-1", "ASSET-2", "ASSET-3"]);
      expect(mockRedisClient.keys).toHaveBeenCalledWith("platform:splint_invest:assets:*");
    });

    it("should return empty array when no assets found", async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await assetStorage.getAllPlatformAssetIds("splint_invest");

      expect(result).toEqual([]);
    });
  });
});
      const result = await assetStorage.getAsset({
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001",
      });
      expect(result).toEqual(mockAsset);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001",
      );
    });
      const result = await assetStorage.getAsset({
        platform: "splint_invest",
        assetId: "NONEXISTENT",
      });
      expect(result).toBeNull();
    });
    it("should handle Redis errors", async () => {
      mockRedisClient.get.mockRejectedValue(
        new Error("Redis connection failed"),
      );
      await expect(
        assetStorage.getAsset({
          platform: "splint_invest",
          assetId: "WINE-BORDEAUX-001",
        }),
      ).rejects.toThrow("Redis connection failed");
    });
  });
  describe("getAssetsByPlatform", () => {
    it("should return assets for platform", async () => {
      const assets = mockAssets.splint_invest;
      const keys = assets.map(
        (_, i) => `platform:splint_invest:assets:asset-${i}`,
      );
      const values = assets.map((asset) => JSON.stringify(asset));
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);
      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50,
      });
      expect(result).toEqual(assets);
      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        "platform:splint_invest:assets:*",
      );
      expect(mockRedisClient.mGet).toHaveBeenCalledWith(keys);
    });
      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50,
      });
      expect(result).toEqual([]);
    });
    it("should respect limit parameter", async () => {
      const assets = Array.from({ length: 10 }, (_, i) =>
        createMockAsset({ assetId: `ASSET-${i}` }),
      );
      const keys = assets.map(
        (_, i) => `platform:splint_invest:assets:asset-${i}`,
      );
      const values = assets.map((asset) => JSON.stringify(asset));
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);
      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 5,
      });
      expect(result).toHaveLength(5);
    it("should handle null values in mGet response", async () => {
      const keys = ["key1", "key2", "key3"];
      const values = [
        JSON.stringify(createMockAsset()),
        null,
        JSON.stringify(createMockAsset()),
      ];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.mGet.mockResolvedValue(values);
      const result = await assetStorage.getAssetsByPlatform({
        platform: "splint_invest",
        limit: 50,
      });
      expect(result).toHaveLength(2);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001",
        JSON.stringify(mockAsset),
      );
    });
      const mockAsset = createMockAsset();
      mockRedisClient.set.mockRejectedValue(new Error("Storage failed"));
      await expect(
        assetStorage.storeAsset(mockAsset, "splint_invest"),
      ).rejects.toThrow("Storage failed");
    });
  });
      const result = await assetStorage.getUserPortfolio({
        platform: "splint_invest",
        userId: "test_user_1",
      });
      expect(result).toEqual(portfolio);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "platform:splint_invest:users:test_user_1:portfolio",
      );
    });
      const result = await assetStorage.getUserPortfolio({
        platform: "splint_invest",
        userId: "test_user_1",
      });
      expect(result).toEqual([]);
      const portfolio = mockPortfolioHoldings.splint_invest;
      mockRedisClient.set.mockResolvedValue("OK");
      await assetStorage.storeUserPortfolio(
        "test_user_1",
        "splint_invest",
        portfolio,
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "platform:splint_invest:users:test_user_1:portfolio",
        JSON.stringify(portfolio),
      );
    });
  });
        totalValue: 1000000,
        assetCategories: [],
        supportedFeatures: [],
        lastUpdated: "2024-01-01T00:00:00Z",
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(platformInfo));
      const result = await assetStorage.getPlatformInfo("splint_invest");
      expect(result).toEqual(platformInfo);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        "platform:splint_invest:info",
      );
    });
    it("should return null when platform info not found", async () => {
  describe("getAssetsByIds", () => {
    it("should return assets for given IDs", async () => {
      const assets = [
        createMockAsset(),
        createMockAsset({ assetId: "ASSET-2" }),
      ];
      const assetIds = ["ASSET-1", "ASSET-2"];
      const values = assets.map((asset) => JSON.stringify(asset));
      mockRedisClient.mGet.mockResolvedValue(values);
      const result = await assetStorage.getAssetsByIds(
        assetIds,
        "splint_invest",
      );
      expect(result).toEqual(assets);
      expect(mockRedisClient.mGet).toHaveBeenCalledWith([
        "platform:splint_invest:assets:ASSET-1",
        "platform:splint_invest:assets:ASSET-2",
      ]);
    });
      mockRedisClient.mGet.mockResolvedValue(values);
      const result = await assetStorage.getAssetsByIds(
        assetIds,
        "splint_invest",
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(asset);
      await assetStorage.deleteAsset("WINE-BORDEAUX-001", "splint_invest");
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        "platform:splint_invest:assets:WINE-BORDEAUX-001",
      );
    });
  });
      const keys = [
        "platform:splint_invest:assets:ASSET-1",
        "platform:splint_invest:assets:ASSET-2",
        "platform:splint_invest:assets:ASSET-3",
      ];

      mockRedisClient.keys.mockResolvedValue(keys);
      const result = await assetStorage.getAllPlatformAssetIds("splint_invest");
      expect(result).toEqual(["ASSET-1", "ASSET-2", "ASSET-3"]);
      expect(mockRedisClient.keys).toHaveBeenCalledWith(
        "platform:splint_invest:assets:*",
      );
    });
    it("should return empty array when no assets found", async () => {
      expect(result).toEqual([]);
    });
  });
});
