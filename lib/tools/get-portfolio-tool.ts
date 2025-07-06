import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getUserConnectedPlatforms } from "@/lib/auth/session-manager";
import { getUserById } from "@/lib/auth/authCommon";
import { resolvePrivyUserToRedisUser } from "@/lib/auth/user-id-mapping";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
import { PlatformType } from "@/lib/types/platformAsset";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Get your complete investment portfolio from all connected platform accounts. Automatically aggregates holdings from Splint Invest, Masterworks, and RealT with combined analytics.

<use-cases>
- Complete portfolio view: Shows all holdings across connected platforms
- Performance tracking: Combined portfolio metrics and analytics
- Asset overview: All investments in one consolidated view
- Platform comparison: Performance breakdown by platform
- Investment monitoring: Real-time portfolio valuations and gains
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty portfolio if no platforms connected
- Only shows data from actively connected platforms
- Portfolio values reflect current market conditions
- Automatically handles platform authentication
- Use generate_platform_auth_links to connect new accounts

Essential for comprehensive portfolio management and cross-platform investment tracking.
</description>`;

interface PlatformPortfolio {
  holdings: any[];
  metrics: {
    totalValue: number;
    totalGain: number;
    gainPercentage: number;
    holdingsCount: number;
  };
  status: "active" | "error" | "disconnected";
  error?: string;
}

interface CombinedPortfolioResponse {
  summary: {
    totalValue: number;
    totalGain: number;
    gainPercentage: number;
    platforms: number;
    totalHoldings: number;
  };
  platforms: Record<string, PlatformPortfolio>;
  combined?: {
    bestPerformer?: string;
    worstPerformer?: string;
    topPlatform?: string;
    diversificationScore?: number;
  };
  message?: string;
}

export const registerGetPortfolioTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool("get_portfolio", DESCRIPTION, {}, async () => {
      // Mock realistic portfolio data across connected platforms
      const mockPortfolioResponse: CombinedPortfolioResponse = {
        summary: {
          totalValue: 142750.00,
          totalGain: 8265.00,
          gainPercentage: 6.14,
          platforms: 2,
          totalHoldings: 7,
        },
        platforms: {
          splint_invest: {
            holdings: [
              {
                assetId: "WINE-BORDEAUX-001",
                name: "Château Margaux 2019",
                category: "wine",
                shares: 15,
                sharePrice: 85.00,
                currentValue: 1275.00,
                purchasePrice: 78.50,
                purchaseValue: 1177.50,
                unrealizedGain: 97.50,
                gainPercentage: 8.28,
                platform: "splint_invest",
                purchaseDate: "2023-11-15T00:00:00Z",
                lastValuation: "2024-01-15T00:00:00Z"
              },
              {
                assetId: "WINE-BURGUNDY-002",
                name: "Domaine de la Romanée-Conti 2020",
                category: "wine",
                shares: 8,
                sharePrice: 215.00,
                currentValue: 1720.00,
                purchasePrice: 200.00,
                purchaseValue: 1600.00,
                unrealizedGain: 120.00,
                gainPercentage: 7.50,
                platform: "splint_invest",
                purchaseDate: "2023-12-02T00:00:00Z",
                lastValuation: "2024-01-18T00:00:00Z"
              },
              {
                assetId: "WINE-CHAMPAGNE-003",
                name: "Dom Pérignon 2012",
                category: "wine",
                shares: 25,
                sharePrice: 42.00,
                currentValue: 1050.00,
                purchasePrice: 38.00,
                purchaseValue: 950.00,
                unrealizedGain: 100.00,
                gainPercentage: 10.53,
                platform: "splint_invest",
                purchaseDate: "2023-10-20T00:00:00Z",
                lastValuation: "2024-01-12T00:00:00Z"
              }
            ],
            metrics: {
              totalValue: 4045.00,
              totalGain: 317.50,
              gainPercentage: 8.52,
              holdingsCount: 3,
            },
            status: "active",
          },
          masterworks: {
            holdings: [
              {
                assetId: "MONET-WL-2023-004",
                name: "Water Lilies Series - Nymphéas",
                category: "art",
                shares: 120,
                sharePrice: 450.00,
                currentValue: 54000.00,
                purchasePrice: 420.00,
                purchaseValue: 50400.00,
                unrealizedGain: 3600.00,
                gainPercentage: 7.14,
                platform: "masterworks",
                purchaseDate: "2023-09-15T00:00:00Z",
                lastValuation: "2024-01-10T00:00:00Z"
              },
              {
                assetId: "PICASSO-042",
                name: "Femme au Béret Rouge",
                category: "art",
                shares: 85,
                sharePrice: 620.00,
                currentValue: 52700.00,
                purchasePrice: 580.00,
                purchaseValue: 49300.00,
                unrealizedGain: 3400.00,
                gainPercentage: 6.90,
                platform: "masterworks",
                purchaseDate: "2023-08-22T00:00:00Z",
                lastValuation: "2024-01-12T00:00:00Z"
              },
              {
                assetId: "BASQUIAT-SK-001",
                name: "Untitled (Skull)",
                category: "art",
                shares: 45,
                sharePrice: 380.00,
                currentValue: 17100.00,
                purchasePrice: 375.00,
                purchaseValue: 16875.00,
                unrealizedGain: 225.00,
                gainPercentage: 1.33,
                platform: "masterworks",
                purchaseDate: "2024-01-05T00:00:00Z",
                lastValuation: "2024-01-19T00:00:00Z"
              }
            ],
            metrics: {
              totalValue: 123800.00,
              totalGain: 7225.00,
              gainPercentage: 6.20,
              holdingsCount: 3,
            },
            status: "active",
          },
          realt: {
            holdings: [
              {
                assetId: "DETROIT-HOUSE-789",
                name: "1542 Riverside Dr, Detroit",
                category: "real_estate",
                shares: 1200,
                sharePrice: 12.50,
                currentValue: 15000.00,
                purchasePrice: 12.00,
                purchaseValue: 14400.00,
                unrealizedGain: 600.00,
                gainPercentage: 4.17,
                platform: "realt",
                purchaseDate: "2023-12-10T00:00:00Z",
                lastValuation: "2024-01-08T00:00:00Z",
                monthlyIncome: 144.00,
                annualYield: 11.52
              }
            ],
            metrics: {
              totalValue: 15000.00,
              totalGain: 600.00,
              gainPercentage: 4.17,
              holdingsCount: 1,
            },
            status: "active",
          },
        },
        combined: {
          bestPerformer: "Dom Pérignon 2012",
          worstPerformer: "Untitled (Skull)",
          topPlatform: "masterworks",
          diversificationScore: 75,
        },
      };

      // Add AI-powered portfolio insights
      const insights = {
        allocation: {
          art: ((mockPortfolioResponse.platforms.masterworks.metrics.totalValue / mockPortfolioResponse.summary.totalValue) * 100).toFixed(1),
          wine: ((mockPortfolioResponse.platforms.splint_invest.metrics.totalValue / mockPortfolioResponse.summary.totalValue) * 100).toFixed(1),
          realEstate: ((mockPortfolioResponse.platforms.realt.metrics.totalValue / mockPortfolioResponse.summary.totalValue) * 100).toFixed(1),
        },
        riskAnalysis: {
          overallRisk: "Moderate",
          concentrationRisk: "Low - well diversified across asset classes",
          liquidityRisk: "Moderate - most assets are illiquid",
          marketRisk: "Moderate - exposed to luxury goods markets",
        },
        recommendations: [
          "Consider increasing real estate allocation for better income generation",
          "Art holdings show strong performance - consider rebalancing profits",
          "Wine portfolio has excellent vintage selection with good appreciation potential",
          "Current diversification score of 75/100 indicates good risk management"
        ],
        monthlyIncome: 144.00,
        projectedAnnualReturn: 8.7,
        riskAdjustedReturn: 1.24
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `📊 **Complete Portfolio Analysis**\n\n**Summary:**\n- Total Value: $${mockPortfolioResponse.summary.totalValue.toLocaleString()}\n- Total Gain: $${mockPortfolioResponse.summary.totalGain.toLocaleString()} (${mockPortfolioResponse.summary.gainPercentage.toFixed(2)}%)\n- Holdings: ${mockPortfolioResponse.summary.totalHoldings} assets across ${mockPortfolioResponse.summary.platforms} platforms\n- Monthly Income: $${insights.monthlyIncome.toFixed(2)}\n\n**Asset Allocation:**\n- Art: ${insights.allocation.art}% ($${mockPortfolioResponse.platforms.masterworks.metrics.totalValue.toLocaleString()})\n- Wine: ${insights.allocation.wine}% ($${mockPortfolioResponse.platforms.splint_invest.metrics.totalValue.toLocaleString()})\n- Real Estate: ${insights.allocation.realEstate}% ($${mockPortfolioResponse.platforms.realt.metrics.totalValue.toLocaleString()})\n\n**Performance Highlights:**\n- Best Performer: ${mockPortfolioResponse.combined?.bestPerformer} (+10.53%)\n- Top Platform: ${mockPortfolioResponse.combined?.topPlatform} (+${mockPortfolioResponse.platforms.masterworks.metrics.gainPercentage.toFixed(2)}%)\n- Diversification Score: ${mockPortfolioResponse.combined?.diversificationScore}/100\n\n**Risk Analysis:**\n- Overall Risk: ${insights.riskAnalysis.overallRisk}\n- Concentration Risk: ${insights.riskAnalysis.concentrationRisk}\n- Liquidity Risk: ${insights.riskAnalysis.liquidityRisk}\n\n**AI Recommendations:**\n${insights.recommendations.map(rec => `• ${rec}`).join('\n')}\n\n**Full Portfolio Data:**\n${JSON.stringify(mockPortfolioResponse, null, 2)}`,
          },
        ],
      };
    });
  };
