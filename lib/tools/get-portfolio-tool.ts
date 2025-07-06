import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getUserConnectedPlatforms } from "@/lib/auth/session-manager";
import { getUserById } from "@/lib/auth/authCommon";
import { getPlatformUserByEmail, getUserByEmail } from "@/lib/auth/redis-users";
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
      try {
        // Resolve Privy DID to Redis user ID if needed for session lookup
        let sessionUserId = accessToken.userId;
        if (accessToken.userId.startsWith("did:privy:")) {
          const mappedUserId = await resolvePrivyUserToRedisUser(
            accessToken.userId,
          );
          if (mappedUserId) {
            sessionUserId = mappedUserId;
          }
        }

        // Get user's connected platforms
        const connectedPlatforms = await getUserConnectedPlatforms(
          sessionUserId,
          accessToken.sessionId,
        );

        const activePlatforms = Object.entries(connectedPlatforms)
          .filter(([_, link]) => link !== null && link.status === "active")
          .map(([platform, _]) => platform as PlatformType);

        // If no platforms connected, return empty portfolio
        if (activePlatforms.length === 0) {
          const emptyResponse: CombinedPortfolioResponse = {
            summary: {
              totalValue: 0,
              totalGain: 0,
              gainPercentage: 0,
              platforms: 0,
              totalHoldings: 0,
            },
            platforms: {},
            message:
              "No platforms connected. Use generate_platform_auth_links to connect your investment accounts.",
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `📊 Portfolio Summary:\n\n${JSON.stringify(emptyResponse, null, 2)}`,
              },
            ],
          };
        }

        // Fetch portfolios from all active platforms
        const platformPortfolios: Record<string, PlatformPortfolio> = {};
        let totalValue = 0;
        let totalGain = 0;
        let totalHoldings = 0;

        for (const platform of activePlatforms) {
          try {
            if (!accessToken.sessionId) {
              platformPortfolios[platform] = {
                holdings: [],
                metrics: {
                  totalValue: 0,
                  totalGain: 0,
                  gainPercentage: 0,
                  holdingsCount: 0,
                },
                status: "error",
                error: "No active session found",
              };
              continue;
            }

            let portfolio;
            let holdings = [];

            try {
              // Try platform API first
              portfolio = await makeAuthenticatedPlatformCall(
                accessToken.sessionId,
                platform,
                "/portfolio",
              );
              holdings = portfolio.holdings || [];
            } catch (platformError) {
              // Fallback to Redis portfolio data
              console.log(
                `Platform API failed for ${platform}, falling back to Redis data`,
              );

              // First try to get the user by session user ID (which should be the main Redis user ID)
              let portfolios;
              const user = await getUserById(sessionUserId);
              if (user) {
                portfolios = user.portfolios;
              }

              // If no user found by session ID and we have email, try to find by email
              if (!portfolios && accessToken.userData?.email) {
                // First try regular user lookup by email
                const userByEmail = await getUserByEmail(accessToken.userData.email);
                if (userByEmail) {
                  portfolios = userByEmail.portfolios;
                } else {
                  // Final fallback: Try platform-specific user
                  const platformUser = await getPlatformUserByEmail(
                    platform,
                    accessToken.userData.email,
                  );
                  if (platformUser) {
                    portfolios = platformUser.portfolios;
                  }
                }
              }

              if (portfolios && portfolios[platform]) {
                const rawHoldings = portfolios[platform];
                holdings = await constructUserPortfolio(rawHoldings, platform);
              }
            }

            // Calculate platform metrics
            const platformValue = holdings.reduce(
              (sum: number, holding: any) => sum + (holding.currentValue || 0),
              0,
            );
            const platformGain = holdings.reduce(
              (sum: number, holding: any) =>
                sum + (holding.unrealizedGain || 0),
              0,
            );
            const platformGainPercentage =
              platformValue > 0
                ? (platformGain / (platformValue - platformGain)) * 100
                : 0;

            platformPortfolios[platform] = {
              holdings,
              metrics: {
                totalValue: platformValue,
                totalGain: platformGain,
                gainPercentage: platformGainPercentage,
                holdingsCount: holdings.length,
              },
              status: "active",
            };

            totalValue += platformValue;
            totalGain += platformGain;
            totalHoldings += holdings.length;
          } catch (error) {
            platformPortfolios[platform] = {
              holdings: [],
              metrics: {
                totalValue: 0,
                totalGain: 0,
                gainPercentage: 0,
                holdingsCount: 0,
              },
              status: "error",
              error: `Failed to fetch portfolio: ${error}`,
            };
          }
        }

        // Calculate combined metrics
        const combinedGainPercentage =
          totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;

        // Generate insights for multi-platform portfolios
        let combined: CombinedPortfolioResponse["combined"];
        if (activePlatforms.length > 1) {
          const platformPerformances = Object.entries(platformPortfolios)
            .filter(([_, portfolio]) => portfolio.status === "active")
            .map(([platform, portfolio]) => ({
              platform,
              gainPercentage: portfolio.metrics.gainPercentage,
              totalValue: portfolio.metrics.totalValue,
            }));

          const bestPlatform = platformPerformances.reduce(
            (best, current) =>
              current.gainPercentage > best.gainPercentage ? current : best,
            platformPerformances[0],
          );

          const topValuePlatform = platformPerformances.reduce(
            (top, current) =>
              current.totalValue > top.totalValue ? current : top,
            platformPerformances[0],
          );

          combined = {
            topPlatform: topValuePlatform?.platform,
            diversificationScore: Math.min(
              platformPerformances.length * 25,
              100,
            ),
          };

          // Find best and worst performing assets across all platforms
          const allHoldings = Object.values(platformPortfolios)
            .filter((portfolio) => portfolio.status === "active")
            .flatMap((portfolio) => portfolio.holdings);

          if (allHoldings.length > 0) {
            const bestHolding = allHoldings.reduce((best, current) =>
              (current.gainPercentage || 0) > (best.gainPercentage || 0)
                ? current
                : best,
            );
            const worstHolding = allHoldings.reduce((worst, current) =>
              (current.gainPercentage || 0) < (worst.gainPercentage || 0)
                ? current
                : worst,
            );

            combined.bestPerformer = bestHolding.name || bestHolding.assetId;
            combined.worstPerformer = worstHolding.name || worstHolding.assetId;
          }
        }

        const response: CombinedPortfolioResponse = {
          summary: {
            totalValue,
            totalGain,
            gainPercentage: combinedGainPercentage,
            platforms: activePlatforms.length,
            totalHoldings,
          },
          platforms: platformPortfolios,
          combined,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `📊 Complete Portfolio:\n\n${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ Error retrieving portfolio: ${error}`,
            },
          ],
        };
      }
    });
  };
