import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Retrieves user portfolio holdings from a specific RWA platform. Returns detailed portfolio information including asset holdings, values, and performance metrics.

<use-cases>
- Get user portfolio: platform = "splint_invest", userId = "test_user_1"
- Portfolio analysis: platform = "masterworks", userId = "investor_123"
- Holdings review: platform = "realt", userId = "property_owner_456"
- Investment tracking: View current positions and valuations
- Performance monitoring: Check portfolio growth and asset allocation
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty result if user has no holdings on the specified platform
- User ID must be valid and exist in the system
- Portfolio values are calculated using current market prices
- Holdings include both active and pending investments

Essential for tracking user investments and portfolio performance across RWA platforms.
</description>`;

const GetUserPortfolioSchema = z.object({
  platform: z.enum(["splint_invest", "masterworks", "realt"]).describe("The platform to retrieve portfolio from"),
  userId: z.string().optional().describe("User ID (optional, uses authenticated user if not provided)")
});

export const registerGetUserPortfolioTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_user_portfolio",
      DESCRIPTION,
      GetUserPortfolioSchema.shape,
      async ({ platform, userId }) => {
        // Use authenticated user if no userId provided
        const targetUserId = userId || accessToken.userId;
        
        // Mock realistic user portfolio data
        const mockUserPortfolios: Record<string, Record<string, any>> = {
          [accessToken.userId]: {
            splint_invest: {
              userId: accessToken.userId,
              platform: "splint_invest",
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
                  purchaseDate: "2023-11-15T00:00:00Z",
                  lastValuation: "2024-01-15T00:00:00Z"
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
                  purchaseDate: "2023-10-20T00:00:00Z",
                  lastValuation: "2024-01-12T00:00:00Z"
                }
              ],
              metrics: {
                totalValue: 2325.00,
                totalGain: 197.50,
                gainPercentage: 9.29,
                holdingsCount: 2
              }
            },
            masterworks: {
              userId: accessToken.userId,
              platform: "masterworks",
              holdings: [
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
                  purchaseDate: "2023-08-22T00:00:00Z",
                  lastValuation: "2024-01-12T00:00:00Z"
                }
              ],
              metrics: {
                totalValue: 52700.00,
                totalGain: 3400.00,
                gainPercentage: 6.90,
                holdingsCount: 1
              }
            },
            realt: {
              userId: accessToken.userId,
              platform: "realt",
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
                holdingsCount: 1
              }
            }
          }
        };

        // Get user portfolio for the specified platform
        const userPortfolios = mockUserPortfolios[targetUserId];
        if (!userPortfolios) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ User portfolio not found for user: ${targetUserId}`,
              },
            ],
          };
        }

        const platformPortfolio = userPortfolios[platform];
        if (!platformPortfolio || platformPortfolio.holdings.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `📋 **No Holdings Found**\n\n**Platform:** ${platform}\n**User:** ${targetUserId}\n\nThis user doesn't have any investments on ${platform} yet.\n\n**Suggestion:** Browse available assets using get_assets_by_platform to start investing!`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `📊 **${platform.toUpperCase()} Portfolio for ${targetUserId}**\n\n**Portfolio Summary:**\n- Total Value: $${platformPortfolio.metrics.totalValue.toLocaleString()}\n- Total Gain: $${platformPortfolio.metrics.totalGain.toLocaleString()} (${platformPortfolio.metrics.gainPercentage.toFixed(2)}%)\n- Holdings: ${platformPortfolio.metrics.holdingsCount} assets\n\n**Individual Holdings:**\n${platformPortfolio.holdings.map((holding: any, index: number) => `${index + 1}. **${holding.name}** (${holding.assetId})\n   - Shares: ${holding.shares.toLocaleString()}\n   - Current Value: $${holding.currentValue.toLocaleString()}\n   - Gain: $${holding.unrealizedGain.toLocaleString()} (${holding.gainPercentage.toFixed(2)}%)\n   - Purchase Date: ${new Date(holding.purchaseDate).toLocaleDateString()}${holding.monthlyIncome ? `\n   - Monthly Income: $${holding.monthlyIncome.toFixed(2)}` : ''}`).join('\n\n')}\n\n**Detailed Portfolio Data:**\n${JSON.stringify(platformPortfolio, null, 2)}`,
            },
          ],
        };
      },
    );
  };
