import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  constructUserPortfolio, 
  calculatePortfolioMetrics, 
  calculateDiversificationScore, 
  calculateLiquidityScore, 
  calculateRiskScore 
} from "@/lib/utils/portfolioCalculator";
import { mockPortfolioHoldings } from "@/__tests__/fixtures/mockUsers";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";
import { assetStorage } from "@/lib/storage/redisClient";

vi.mock("@/lib/storage/redisClient");

describe("portfolioCalculator", () => {
  let mockAssetStorage: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAssetStorage = assetStorage;
  });

  describe("constructUserPortfolio", () => {
    it("should construct portfolio with asset data", async () => {
      const holdings = mockPortfolioHoldings.splint_invest;
      const mockAsset = createMockAsset({ 
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 }
      });

      mockAssetStorage.getAsset.mockResolvedValue(mockAsset);

      const result = await constructUserPortfolio(holdings, "splint_invest");

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockAsset,
        ...holdings[0],
        currentValue: 1000, // 10 shares * $100
        unrealizedGain: 50   // (100 - 95) * 10 shares
      });
    });

    it("should handle multiple holdings", async () => {
      const holdings = [
        {
          assetId: "WINE-BORDEAUX-001",
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z"
        },
        {
          assetId: "ART-CONTEMP-001",
          sharesOwned: 5,
          acquisitionPrice: 55,
          acquisitionDate: "2024-01-15T00:00:00Z"
        }
      ];

      const wineAsset = createMockAsset({ 
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 }
      });
      const artAsset = createMockAsset({ 
        assetId: "ART-CONTEMP-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 60 }
      });

      mockAssetStorage.getAsset
        .mockResolvedValueOnce(wineAsset)
        .mockResolvedValueOnce(artAsset);

      const result = await constructUserPortfolio(holdings, "splint_invest");

      expect(result).toHaveLength(2);
      expect(result[0].currentValue).toBe(1000); // 10 * 100
      expect(result[0].unrealizedGain).toBe(50);  // (100 - 95) * 10
      expect(result[1].currentValue).toBe(300);   // 5 * 60
      expect(result[1].unrealizedGain).toBe(25);  // (60 - 55) * 5
    });

    it("should throw error for missing asset", async () => {
      const holdings = mockPortfolioHoldings.splint_invest;
      mockAssetStorage.getAsset.mockResolvedValue(null);

      await expect(constructUserPortfolio(holdings, "splint_invest"))
        .rejects.toThrow("Asset not found: WINE-BORDEAUX-001");
    });

    it("should handle empty holdings", async () => {
      const result = await constructUserPortfolio([], "splint_invest");

      expect(result).toEqual([]);
      expect(mockAssetStorage.getAsset).not.toHaveBeenCalled();
    });

    it("should calculate negative unrealized gains", async () => {
      const holdings = [{
        assetId: "WINE-BORDEAUX-001",
        sharesOwned: 10,
        acquisitionPrice: 120, // Higher than current price
        acquisitionDate: "2024-01-01T00:00:00Z"
      }];

      const mockAsset = createMockAsset({ 
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 }
      });

      mockAssetStorage.getAsset.mockResolvedValue(mockAsset);

      const result = await constructUserPortfolio(holdings, "splint_invest");

      expect(result[0].unrealizedGain).toBe(-200); // (100 - 120) * 10
    });
  });

  describe("calculatePortfolioMetrics", () => {
    it("should calculate basic portfolio metrics", () => {
      const holdings = [
        { currentValue: 1000, unrealizedGain: 50 },
        { currentValue: 500, unrealizedGain: -25 },
        { currentValue: 750, unrealizedGain: 100 }
      ];

      const result = calculatePortfolioMetrics(holdings);

      expect(result).toEqual({
        totalValue: 2250,
        totalGain: 125,
        totalReturn: expect.closeTo(5.88, 2), // 125 / (2250 - 125) * 100
        assetCount: 3
      });
    });

    it("should handle empty portfolio", () => {
      const result = calculatePortfolioMetrics([]);

      expect(result).toEqual({
        totalValue: 0,
        totalGain: 0,
        totalReturn: 0,
        assetCount: 0
      });
    });

    it("should handle zero total value", () => {
      const holdings = [
        { currentValue: 0, unrealizedGain: -100 }
      ];

      const result = calculatePortfolioMetrics(holdings);

      expect(result.totalReturn).toBe(0);
    });

    it("should handle negative gains", () => {
      const holdings = [
        { currentValue: 900, unrealizedGain: -100 }
      ];

      const result = calculatePortfolioMetrics(holdings);

      expect(result).toEqual({
        totalValue: 900,
        totalGain: -100,
        totalReturn: -10, // -100 / (900 + 100) * 100
        assetCount: 1
      });
    });
  });

  describe("calculateDiversificationScore", () => {
    it("should calculate diversification based on categories and risk", () => {
      const assets = [
        createMockAsset({ 
          category: "wine", 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              riskCategory: "conservative" 
            } 
          } 
        }),
        createMockAsset({ 
          category: "art", 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              riskCategory: "moderate" 
            } 
          } 
        }),
        createMockAsset({ 
          category: "real_estate", 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              riskCategory: "aggressive" 
            } 
          } 
        })
      ];

      const result = calculateDiversificationScore(assets);

      // 3 categories / 3 max = 1.0, 3 risk categories / 4 max = 0.75
      // Average = (1.0 + 0.75) / 2 = 0.875
      expect(result).toBeCloseTo(0.875, 3);
    });

    it("should handle single asset portfolio", () => {
      const assets = [createMockAsset()];

      const result = calculateDiversificationScore(assets);

      // 1 category / 3 max = 0.33, 1 risk category / 4 max = 0.25
      // Average = (0.33 + 0.25) / 2 = 0.29
      expect(result).toBeCloseTo(0.29, 2);
    });

    it("should handle empty portfolio", () => {
      const result = calculateDiversificationScore([]);

      expect(result).toBe(0);
    });

    it("should cap scores at 1.0", () => {
      const assets = Array.from({ length: 5 }, (_, i) => 
        createMockAsset({ 
          category: `category_${i}`,
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              riskCategory: ["conservative", "moderate", "aggressive", "speculative"][i % 4] as any
            } 
          } 
        })
      );

      const result = calculateDiversificationScore(assets);

      expect(result).toBeLessThanOrEqual(1.0);
    });
  });

  describe("calculateLiquidityScore", () => {
    it("should calculate liquidity based on investment horizon", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            investmentHorizon: { 
              ...createMockAsset().expertAnalysis.investmentHorizon, 
              minimumYears: 2 
            } 
          } 
        }),
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            investmentHorizon: { 
              ...createMockAsset().expertAnalysis.investmentHorizon, 
              minimumYears: 5 
            } 
          } 
        })
      ];

      const result = calculateLiquidityScore(assets);

      // Average minimum years = (2 + 5) / 2 = 3.5
      // Score = max(0, 1 - (3.5 / 10)) = 0.65
      expect(result).toBeCloseTo(0.65, 2);
    });

    it("should handle high illiquidity", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            investmentHorizon: { 
              ...createMockAsset().expertAnalysis.investmentHorizon, 
              minimumYears: 15 
            } 
          } 
        })
      ];

      const result = calculateLiquidityScore(assets);

      expect(result).toBe(0); // max(0, 1 - (15 / 10)) = 0
    });

    it("should handle very liquid assets", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            investmentHorizon: { 
              ...createMockAsset().expertAnalysis.investmentHorizon, 
              minimumYears: 0 
            } 
          } 
        })
      ];

      const result = calculateLiquidityScore(assets);

      expect(result).toBe(1); // max(0, 1 - (0 / 10)) = 1
    });

    it("should handle empty portfolio", () => {
      const result = calculateLiquidityScore([]);

      expect(result).toBeNaN(); // Division by zero
    });
  });

  describe("calculateRiskScore", () => {
    it("should calculate average risk score", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              overallRiskScore: 4 
            } 
          } 
        }),
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              overallRiskScore: 8 
            } 
          } 
        })
      ];

      const result = calculateRiskScore(assets);

      // Average risk = (4 + 8) / 2 = 6
      // Normalized = 6 / 10 = 0.6
      expect(result).toBe(0.6);
    });

    it("should handle maximum risk", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              overallRiskScore: 10 
            } 
          } 
        })
      ];

      const result = calculateRiskScore(assets);

      expect(result).toBe(1);
    });

    it("should handle minimum risk", () => {
      const assets = [
        createMockAsset({ 
          expertAnalysis: { 
            ...createMockAsset().expertAnalysis, 
            riskProfile: { 
              ...createMockAsset().expertAnalysis.riskProfile, 
              overallRiskScore: 1 
            } 
          } 
        })
      ];

      const result = calculateRiskScore(assets);

      expect(result).toBe(0.1);
    });

    it("should handle empty portfolio", () => {
      const result = calculateRiskScore([]);

      expect(result).toBeNaN(); // Division by zero
    });
  });
});
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  constructUserPortfolio,
  calculatePortfolioMetrics,
  calculateDiversificationScore,
  calculateLiquidityScore,
  calculateRiskScore,
} from "@/lib/utils/portfolioCalculator";
import { mockPortfolioHoldings } from "@/__tests__/fixtures/mockUsers";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";
  describe("constructUserPortfolio", () => {
    it("should construct portfolio with asset data", async () => {
      const holdings = mockPortfolioHoldings.splint_invest;
      const mockAsset = createMockAsset({
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 },
      });
      mockAssetStorage.getAsset.mockResolvedValue(mockAsset);
        ...mockAsset,
        ...holdings[0],
        currentValue: 1000, // 10 shares * $100
        unrealizedGain: 50, // (100 - 95) * 10 shares
      });
    });
          assetId: "WINE-BORDEAUX-001",
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
        },
        {
          assetId: "ART-CONTEMP-001",
          sharesOwned: 5,
          acquisitionPrice: 55,
          acquisitionDate: "2024-01-15T00:00:00Z",
        },
      ];
      const wineAsset = createMockAsset({
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 },
      });
      const artAsset = createMockAsset({
        assetId: "ART-CONTEMP-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 60 },
      });
      mockAssetStorage.getAsset
      expect(result).toHaveLength(2);
      expect(result[0].currentValue).toBe(1000); // 10 * 100
      expect(result[0].unrealizedGain).toBe(50); // (100 - 95) * 10
      expect(result[1].currentValue).toBe(300); // 5 * 60
      expect(result[1].unrealizedGain).toBe(25); // (60 - 55) * 5
    });
    it("should throw error for missing asset", async () => {
      const holdings = mockPortfolioHoldings.splint_invest;
      mockAssetStorage.getAsset.mockResolvedValue(null);
      await expect(
        constructUserPortfolio(holdings, "splint_invest"),
      ).rejects.toThrow("Asset not found: WINE-BORDEAUX-001");
    });
    it("should handle empty holdings", async () => {
    });
    it("should calculate negative unrealized gains", async () => {
      const holdings = [
        {
          assetId: "WINE-BORDEAUX-001",
          sharesOwned: 10,
          acquisitionPrice: 120, // Higher than current price
          acquisitionDate: "2024-01-01T00:00:00Z",
        },
      ];
      const mockAsset = createMockAsset({
        assetId: "WINE-BORDEAUX-001",
        valuation: { ...createMockAsset().valuation, sharePrice: 100 },
      });
      mockAssetStorage.getAsset.mockResolvedValue(mockAsset);
      const holdings = [
        { currentValue: 1000, unrealizedGain: 50 },
        { currentValue: 500, unrealizedGain: -25 },
        { currentValue: 750, unrealizedGain: 100 },
      ];
      const result = calculatePortfolioMetrics(holdings);
        totalValue: 2250,
        totalGain: 125,
        totalReturn: expect.closeTo(5.88, 2), // 125 / (2250 - 125) * 100
        assetCount: 3,
      });
    });
        totalValue: 0,
        totalGain: 0,
        totalReturn: 0,
        assetCount: 0,
      });
    });
    it("should handle zero total value", () => {
      const holdings = [{ currentValue: 0, unrealizedGain: -100 }];
      const result = calculatePortfolioMetrics(holdings);
    });
    it("should handle negative gains", () => {
      const holdings = [{ currentValue: 900, unrealizedGain: -100 }];
      const result = calculatePortfolioMetrics(holdings);
        totalValue: 900,
        totalGain: -100,
        totalReturn: -10, // -100 / (900 + 100) * 100
        assetCount: 1,
      });
    });
  });
  describe("calculateDiversificationScore", () => {
    it("should calculate diversification based on categories and risk", () => {
      const assets = [
        createMockAsset({
          category: "wine",
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              riskCategory: "conservative",
            },
          },
        }),
        createMockAsset({
          category: "art",
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              riskCategory: "moderate",
            },
          },
        }),
        createMockAsset({
          category: "real_estate",
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              riskCategory: "aggressive",
            },
          },
        }),
      ];
      const result = calculateDiversificationScore(assets);
    });
    it("should cap scores at 1.0", () => {
      const assets = Array.from({ length: 5 }, (_, i) =>
        createMockAsset({
          category: `category_${i}`,
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              riskCategory: [
                "conservative",
                "moderate",
                "aggressive",
                "speculative",
              ][i % 4] as any,
            },
          },
        }),
      );
      const result = calculateDiversificationScore(assets);
  describe("calculateLiquidityScore", () => {
    it("should calculate liquidity based on investment horizon", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            investmentHorizon: {
              ...createMockAsset().expertAnalysis.investmentHorizon,
              minimumYears: 2,
            },
          },
        }),
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            investmentHorizon: {
              ...createMockAsset().expertAnalysis.investmentHorizon,
              minimumYears: 5,
            },
          },
        }),
      ];
      const result = calculateLiquidityScore(assets);
    it("should handle high illiquidity", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            investmentHorizon: {
              ...createMockAsset().expertAnalysis.investmentHorizon,
              minimumYears: 15,
            },
          },
        }),
      ];
      const result = calculateLiquidityScore(assets);
    it("should handle very liquid assets", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            investmentHorizon: {
              ...createMockAsset().expertAnalysis.investmentHorizon,
              minimumYears: 0,
            },
          },
        }),
      ];
      const result = calculateLiquidityScore(assets);
  describe("calculateRiskScore", () => {
    it("should calculate average risk score", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              overallRiskScore: 4,
            },
          },
        }),
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              overallRiskScore: 8,
            },
          },
        }),
      ];
      const result = calculateRiskScore(assets);
    it("should handle maximum risk", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              overallRiskScore: 10,
            },
          },
        }),
      ];
      const result = calculateRiskScore(assets);
    it("should handle minimum risk", () => {
      const assets = [
        createMockAsset({
          expertAnalysis: {
            ...createMockAsset().expertAnalysis,
            riskProfile: {
              ...createMockAsset().expertAnalysis.riskProfile,
              overallRiskScore: 1,
            },
          },
        }),
      ];
      const result = calculateRiskScore(assets);
      expect(result).toBeNaN(); // Division by zero
    });
  });
});
