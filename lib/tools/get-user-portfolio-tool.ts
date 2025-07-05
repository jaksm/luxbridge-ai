import { getUserById } from "@/lib/auth/authCommon";
import { GetUserPortfolioSchema } from "@/lib/types/schemas";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
import { RegisterTool } from "./types";

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

export const registerGetUserPortfolioTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_user_portfolio",
      DESCRIPTION,
      GetUserPortfolioSchema.shape,
      async ({ platform, userId }) => {
        try {
          const user = getUserById(userId);
          if (!user) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `User not found: ${userId}`,
                },
              ],
            };
          }

          const holdings =
            user.portfolios[platform as keyof typeof user.portfolios];
          if (holdings.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No holdings found for user ${userId} on platform ${platform}`,
                },
              ],
            };
          }

          const constructedAssets = await constructUserPortfolio(
            holdings,
            platform,
          );
          return {
            content: [
              {
                type: "text" as const,
                text: `Portfolio for ${userId} on ${platform}:\n\n${JSON.stringify(constructedAssets, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error retrieving portfolio: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
