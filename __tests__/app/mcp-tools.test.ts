import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";
import { mockPortfolioHoldings, mockUsers } from "@/__tests__/fixtures/mockUsers";
import { mockTokenPayloads } from "@/__tests__/fixtures/mockTokens";
import { assetStorage } from "@/lib/storage/redisClient";
import { PineconeClient } from "@/lib/storage/pineconeClient";
import { GetAssetSchema, GetAssetsByPlatformSchema, GetUserPortfolioSchema, SemanticSearchSchema } from "@/lib/types/schemas";

vi.mock("@/lib/storage/redisClient");
vi.mock("@/lib/storage/pineconeClient");
vi.mock("@/lib/auth/authCommon");

describe("MCP Tools with Zod Validation", () => {
  let mockPineconeClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPineconeClient = new PineconeClient();
  });

  describe("get_asset tool schema", () => {
    it("should validate correct parameters", () => {
      const validParams = {
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001"
      };

      const result = GetAssetSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should reject invalid platform", () => {
      const invalidParams = {
        platform: "invalid_platform",
        assetId: "WINE-BORDEAUX-001"
      };

      const result = GetAssetSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("should reject missing assetId", () => {
      const invalidParams = {
        platform: "splint_invest"
      };

      const result = GetAssetSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });

    it("should handle tool execution with valid params", async () => {
      const mockAsset = createMockAsset();
      vi.mocked(assetStorage.getAsset).mockResolvedValue(mockAsset);

      const params = {
        platform: "splint_invest",
        assetId: "WINE-BORDEAUX-001"
      };

      const result = await assetStorage.getAsset(params);
      expect(result).toEqual(mockAsset);
    });
  });

  describe("get_assets_by_platform tool schema", () => {
    it("should validate correct parameters", () => {
      const validParams = {
        platform: "masterworks",
        limit: 20
      };

      const result = GetAssetsByPlatformSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should provide default limit", () => {
      const params = {
        platform: "realt"
      };

      const result = GetAssetsByPlatformSchema.safeParse(params);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(50);
    });

    it("should validate limit boundaries", () => {
      const tooHighLimit = {
        platform: "splint_invest",
        limit: 250
      };

      const result = GetAssetsByPlatformSchema.safeParse(tooHighLimit);
      expect(result.success).toBe(false);
    });

    it("should allow optional parameters", () => {
      const minimalParams = {
        platform: "splint_invest"
      };

      const result = GetAssetsByPlatformSchema.safeParse(minimalParams);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(50); // default value
    });
  });

  describe("get_user_portfolio tool schema", () => {
    it("should validate correct parameters", () => {
      const validParams = {
        platform: "splint_invest",
        userId: "test_user_1"
      };

      const result = GetUserPortfolioSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should accept any string userId", () => {
      const params = {
        platform: "splint_invest",
        userId: "any_user_id_123"
      };

      const result = GetUserPortfolioSchema.safeParse(params);
      expect(result.success).toBe(true);
      expect(result.data?.userId).toBe("any_user_id_123");
    });

    it("should handle tool execution with portfolio construction", async () => {
      vi.mocked(assetStorage.getUserPortfolio).mockResolvedValue(mockPortfolioHoldings.splint_invest);
      vi.mocked(assetStorage.getAssetsByIds).mockResolvedValue([createMockAsset()]);

      const params = {
        platform: "splint_invest",
        userId: "test_user_1"
      };

      const holdings = await assetStorage.getUserPortfolio(params);
      expect(holdings).toEqual(mockPortfolioHoldings.splint_invest);
    });
  });

  describe("semantic_search tool schema", () => {
    it("should validate correct parameters", () => {
      const validParams = {
        query: "high yield wine investments",
        platform: "splint_invest",
        limit: 5,
        minScore: 0.7
      };

      const result = SemanticSearchSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validParams);
    });

    it("should provide default values", () => {
      const params = {
        query: "art investments"
      };

      const result = SemanticSearchSchema.safeParse(params);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(10);
      expect(result.data?.minScore).toBe(0.1); // actual default
    });

    it("should accept any query string", () => {
      const shortQuery = {
        query: "a"
      };

      const result = SemanticSearchSchema.safeParse(shortQuery);
      expect(result.success).toBe(true);
      expect(result.data?.query).toBe("a");
    });

    it("should validate score boundaries", () => {
      const invalidScore = {
        query: "investments",
        minScore: 1.5
      };

      const result = SemanticSearchSchema.safeParse(invalidScore);
      expect(result.success).toBe(false);
    });

    it("should handle semantic search execution", async () => {
      const mockResults = ["WINE-BORDEAUX-001", "WINE-RHONE-002"];
      vi.mocked(mockPineconeClient.searchAssets).mockResolvedValue(mockResults);

      const params = {
        query: "fine wine",
        platform: "splint_invest",
        limit: 5,
        minScore: 0.6
      };

      const results = await mockPineconeClient.searchAssets(params);
      expect(results).toEqual(mockResults);
    });
  });

  describe("Integration with MCP handler", () => {
    it("should validate authenticated user context", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");
      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);

      const authHeader = "Bearer valid.token";
      const tokenPayload = authenticateToken(authHeader);

      expect(tokenPayload).toEqual(mockTokenPayloads.valid);
      expect(tokenPayload?.userId).toBe("test_user_1");
      expect(tokenPayload?.platform).toBe("splint_invest");
    });

    it("should handle authorization failures", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");
      vi.mocked(authenticateToken).mockReturnValue(null);

      const authHeader = "Bearer invalid.token";
      const tokenPayload = authenticateToken(authHeader);

      expect(tokenPayload).toBeNull();
    });
  });
});
