import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, OPTIONS } from "@/app/api/cross-platform/analysis/route";
import {
  createMockRequestWithAuth,
  expectJSONResponse,
  expectErrorResponse,
} from "@/__tests__/utils/testHelpers";
import {
  mockTokenPayloads,
  mockJWTTokens,
} from "@/__tests__/fixtures/mockTokens";
import { mockUsers } from "@/__tests__/fixtures/mockUsers";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";

vi.mock("@/lib/auth/authCommon");
vi.mock("@/lib/utils/portfolioCalculator");

describe("Cross-Platform Analysis Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return cross-platform analysis for user with holdings", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const {
        constructUserPortfolio,
        calculateDiversificationScore,
        calculateLiquidityScore,
        calculateRiskScore,
      } = await import("@/lib/utils/portfolioCalculator");

      const mockUser = mockUsers["test@example.com"];
      const mockConstructedAssets = [
        {
          ...createMockAsset({ category: "wine" }),
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
          currentValue: 1000,
          unrealizedGain: 50,
        },
      ];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockResolvedValue(mockUser);
      vi.mocked(constructUserPortfolio).mockResolvedValue(
        mockConstructedAssets,
      );
      vi.mocked(calculateDiversificationScore).mockReturnValue(0.6);
      vi.mocked(calculateLiquidityScore).mockReturnValue(0.7);
      vi.mocked(calculateRiskScore).mockReturnValue(0.5);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      expect(data).toMatchObject({
        portfolioAnalysis: {
          totalValue: expect.any(Number),
          crossPlatformRisk: 0.5,
          diversificationScore: 0.6,
          liquidityScore: 0.7,
        },
        arbitrageOpportunities: [],
        rebalanceRecommendations: [],
      });

      expect(constructUserPortfolio).toHaveBeenCalledTimes(3); // Called for each platform
    });

    it("should return empty analysis for user with no holdings", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const emptyUser = mockUsers["empty@example.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(emptyUser);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      expect(data).toMatchObject({
        portfolioAnalysis: {
          totalValue: 0,
          crossPlatformRisk: 0,
          diversificationScore: 0,
          liquidityScore: 0,
        },
        arbitrageOpportunities: [],
        rebalanceRecommendations: [
          {
            action: "buy",
            platform: "splint_invest",
            assetId: "recommended_starter_asset",
            reasoning:
              "Consider starting with a diversified asset to build your portfolio",
          },
        ],
      });
    });

    it("should handle demo user", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const demoUser = mockUsers["jaksa.malisic@gmail.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(demoUser);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      expect(data.portfolioAnalysis.totalValue).toBe(0);
      expect(data.rebalanceRecommendations).toHaveLength(1);
      expect(data.rebalanceRecommendations[0].action).toBe("buy");
    });

    it("should reject missing authorization", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth();

      const response = await GET(request);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should handle user not found", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockResolvedValue(undefined);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);

      await expectErrorResponse(
        response,
        404,
        "user_not_found",
        "User not found",
      );
    });

    it("should aggregate assets across all platforms", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const {
        constructUserPortfolio,
        calculateDiversificationScore,
        calculateLiquidityScore,
        calculateRiskScore,
      } = await import("@/lib/utils/portfolioCalculator");

      const mockUser = mockUsers["test@example.com"];

      const splintAssets = [
        {
          ...createMockAsset({ category: "wine" }),
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
          currentValue: 1000,
          unrealizedGain: 50,
        },
      ];

      const masterworksAssets = [
        {
          ...createMockAsset({ category: "art" }),
          sharesOwned: 2,
          acquisitionPrice: 200,
          acquisitionDate: "2024-01-10T00:00:00Z",
          currentValue: 500,
          unrealizedGain: 100,
        },
      ];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockResolvedValue(mockUser);
      vi.mocked(constructUserPortfolio)
        .mockResolvedValueOnce(splintAssets)
        .mockResolvedValueOnce(masterworksAssets)
        .mockResolvedValueOnce([]); // RealT empty
      vi.mocked(calculateDiversificationScore).mockReturnValue(0.8);
      vi.mocked(calculateLiquidityScore).mockReturnValue(0.6);
      vi.mocked(calculateRiskScore).mockReturnValue(0.4);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      expect(data.portfolioAnalysis.totalValue).toBe(1500); // 1000 + 500
      expect(calculateDiversificationScore).toHaveBeenCalledWith([
        ...splintAssets,
        ...masterworksAssets,
      ]);
    });

    it("should handle portfolio construction errors gracefully", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const { constructUserPortfolio } = await import(
        "@/lib/utils/portfolioCalculator"
      );

      const mockUser = mockUsers["test@example.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockResolvedValue(mockUser);
      vi.mocked(constructUserPortfolio)
        .mockRejectedValueOnce(new Error("Asset not found"))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      // Should still return analysis with other platforms
      expect(data.portfolioAnalysis).toBeDefined();
      expect(data.portfolioAnalysis.totalValue).toBe(0);
    });

    it("should calculate metrics only when assets exist", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const {
        constructUserPortfolio,
        calculateDiversificationScore,
        calculateLiquidityScore,
        calculateRiskScore,
      } = await import("@/lib/utils/portfolioCalculator");

      const mockUser = mockUsers["test@example.com"];
      const mockAssets = [
        {
          ...createMockAsset(),
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
          currentValue: 1000,
          unrealizedGain: 50,
        },
      ];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockResolvedValue(mockUser);
      vi.mocked(constructUserPortfolio)
        .mockResolvedValueOnce(mockAssets)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      vi.mocked(calculateDiversificationScore).mockReturnValue(0.3);
      vi.mocked(calculateLiquidityScore).mockReturnValue(0.5);
      vi.mocked(calculateRiskScore).mockReturnValue(0.6);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);
      const data = await expectJSONResponse(response, 200);

      expect(calculateDiversificationScore).toHaveBeenCalledWith(mockAssets);
      expect(calculateLiquidityScore).toHaveBeenCalledWith(mockAssets);
      expect(calculateRiskScore).toHaveBeenCalledWith(mockAssets);
      expect(data.portfolioAnalysis.crossPlatformRisk).toBe(0.6);
    });

    it("should handle authentication service errors", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockImplementation(() => {
        throw new Error("Auth service error");
      });

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

      const response = await GET(request);

      await expectErrorResponse(
        response,
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    });

    it("should handle invalid token", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth({}, mockJWTTokens.invalid);

      const response = await GET(request);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should work with different platforms in token", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const mockUser = mockUsers["test@example.com"];
      vi.mocked(getUserById).mockResolvedValue(mockUser);

      const platforms = ["splint_invest", "masterworks", "realt"] as const;

      for (const platform of platforms) {
        const tokenPayload = { ...mockTokenPayloads.valid, platform };
        vi.mocked(authenticateToken).mockReturnValue(tokenPayload);

        const request = createMockRequestWithAuth({}, mockJWTTokens.valid);

        const response = await GET(request);
        const data = await expectJSONResponse(response, 200);

        expect(data.portfolioAnalysis).toBeDefined();
      }
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
