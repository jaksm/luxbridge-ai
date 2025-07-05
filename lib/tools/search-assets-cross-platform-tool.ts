import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { PlatformType } from "@/lib/types/platformAsset";
import { SearchAssetsCrossPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Search for assets across linked platforms using stored credentials. Performs semantic search across multiple RWA platforms simultaneously using natural language queries.

<use-cases>
- Cross-platform search: semanticQuery = "luxury art investments", limit = 10
- Targeted platforms: platforms = ["masterworks", "splint_invest"], semanticQuery = "high yield"
- Investment discovery: semanticQuery = "real estate Detroit", platforms = ["realt"]
- Market analysis: Search for similar assets across all linked platforms
- Opportunity finding: Discover investment options matching specific criteria
</use-cases>

🚨 CRITICAL WARNINGS:

- Only searches platforms with active authentication connections
- Skips platforms with expired or failed credentials
- Search timeout may occur with large result sets across multiple platforms

⚠️ IMPORTANT NOTES:

- Automatically uses your authenticated session
- Semantic query uses AI-powered matching across platform catalogs
- Results include metadata about credential status and search performance
- Platforms with inactive connections are automatically excluded
- Default searches across splint_invest, masterworks, and realt platforms

Essential for discovering investment opportunities across multiple connected RWA platforms using natural language criteria.
</description>`;

export const registerSearchAssetsCrossPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "search_assets_cross_platform",
      DESCRIPTION,
      SearchAssetsCrossPlatformSchema.shape,
      async ({ platforms, semanticQuery, limit = 10 }) => {
        try {
          // Get sessionId from access token
          if (!accessToken.sessionId) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ No active session found. This may be due to an older authentication. Please reconnect to create a new session.",
                },
              ],
            };
          }

          const session = await getAuthSession(accessToken.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ Invalid or expired session. Please reconnect to refresh your session.",
                },
              ],
            };
          }

          const searchStartTime = Date.now();
          const targetPlatforms =
            platforms ||
            (["splint_invest", "masterworks", "realt"] as PlatformType[]);
          const results = [];

          let totalResults = 0;
          let platformsSearched = 0;

          for (const platform of targetPlatforms) {
            const platformLink = session.platforms[platform];
            if (!platformLink || platformLink.status !== "active") {
              continue;
            }

            try {
              const searchResponse = await makeAuthenticatedPlatformCall(
                accessToken.sessionId,
                platform,
                `/assets?semanticSearch=${encodeURIComponent(semanticQuery)}&limit=${limit}`,
              );

              const assets = searchResponse.assets || [];
              results.push({
                platform,
                assets,
                resultCount: assets.length,
                credentialStatus: platformLink.status,
              });

              totalResults += assets.length;
              platformsSearched += 1;
            } catch (error) {
              results.push({
                platform,
                assets: [],
                resultCount: 0,
                credentialStatus: "invalid",
              });
            }
          }

          const searchTimeMs = Date.now() - searchStartTime;

          const response = {
            results,
            summary: {
              totalResults,
              platformsSearched,
              searchTimeMs,
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `🔍 Cross-platform search results for "${semanticQuery}":\n\n${JSON.stringify(response, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error performing cross-platform search: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
