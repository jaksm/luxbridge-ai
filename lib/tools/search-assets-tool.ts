import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getUserConnectedPlatforms } from "@/lib/auth/session-manager";
import { PlatformType } from "@/lib/types/platformAsset";
import { SearchAssetsSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Search for investment assets across connected RWA platforms with intelligent multi-platform querying. Automatically searches all connected platforms or specific ones based on your request.

<use-cases>
- Broad search: query = "wine investments" (searches all connected platforms)
- Specific platform: query = "art", platforms = ["masterworks"] 
- Multi-platform comparison: query = "real estate", platforms = ["realt", "splint_invest"]
- Discovery: query = "high yield" (finds opportunities across platforms)
- Research: query = "vintage bordeaux", maxResults = 5
</use-cases>

⚠️ IMPORTANT NOTES:

- Automatically searches all connected platforms if none specified
- Skips disconnected platforms gracefully
- Returns combined results with platform attribution
- Use generate_platform_auth_links to connect more platforms
- Results sorted by relevance and performance metrics

Essential for discovering investment opportunities across multiple RWA platforms simultaneously.
</description>`;

interface PlatformSearchResult {
  assets: any[];
  count: number;
  status: "active" | "no_matches" | "error" | "disconnected";
  error?: string;
}

interface SearchResponse {
  summary: {
    totalResults: number;
    platformsSearched: number;
    query: string;
    searchTimeMs: number;
  };
  results: Record<string, PlatformSearchResult>;
  recommendations?: {
    topMatches: any[];
    searchSuggestions: string[];
  };
}

export const registerSearchAssetsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "search_assets",
      DESCRIPTION,
      SearchAssetsSchema.shape,
      async ({ query, platforms, maxResults = 10 }) => {
        const startTime = Date.now();

        try {
          // Get user's connected platforms
          const connectedPlatforms = await getUserConnectedPlatforms(
            accessToken.userId,
            accessToken.sessionId,
          );

          // Determine which platforms to search
          let platformsToSearch: PlatformType[];
          if (platforms && platforms.length > 0) {
            // Filter requested platforms to only those that are connected
            platformsToSearch = platforms.filter(platform => {
              const link = connectedPlatforms[platform];
              return link !== null && link.status === "active";
            });
          } else {
            // Search all connected platforms
            platformsToSearch = Object.entries(connectedPlatforms)
              .filter(([_, link]) => link !== null && link.status === "active")
              .map(([platform, _]) => platform as PlatformType);
          }

          // If no platforms available, return helpful message
          if (platformsToSearch.length === 0) {
            const searchResponse: SearchResponse = {
              summary: {
                totalResults: 0,
                platformsSearched: 0,
                query,
                searchTimeMs: Date.now() - startTime,
              },
              results: {},
              recommendations: {
                topMatches: [],
                searchSuggestions: [
                  "Connect to investment platforms using generate_platform_auth_links",
                  "Try different search terms once platforms are connected",
                ],
              },
            };

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔍 Search Results for "${query}":\n\n${JSON.stringify(searchResponse, null, 2)}`,
                },
              ],
            };
          }

          // Search each platform
          const searchResults: Record<string, PlatformSearchResult> = {};
          let totalResults = 0;
          const allAssets: any[] = [];

          for (const platform of platformsToSearch) {
            try {
              if (!accessToken.sessionId) {
                searchResults[platform] = {
                  assets: [],
                  count: 0,
                  status: "error",
                  error: "No active session found",
                };
                continue;
              }

              const searchResponse = await makeAuthenticatedPlatformCall(
                accessToken.sessionId,
                platform,
                `/assets/search?query=${encodeURIComponent(query)}&limit=${maxResults}`,
              );

              const assets = searchResponse.assets || [];
              const platformCount = assets.length;

              searchResults[platform] = {
                assets: assets.slice(0, maxResults),
                count: platformCount,
                status: platformCount > 0 ? "active" : "no_matches",
              };

              totalResults += platformCount;

              // Add platform info to assets for cross-platform analysis
              const platformAssets = assets.map((asset: any) => ({
                ...asset,
                platform,
                platformName: getPlatformDisplayName(platform),
              }));
              
              allAssets.push(...platformAssets);

            } catch (error) {
              searchResults[platform] = {
                assets: [],
                count: 0,
                status: "error",
                error: `Search failed: ${error}`,
              };
            }
          }

          // Generate recommendations for multi-platform results
          let recommendations: SearchResponse["recommendations"];
          if (allAssets.length > 0) {
            // Sort all assets by performance or relevance
            const topMatches = allAssets
              .sort((a, b) => {
                // Sort by performance metrics if available
                const aPerf = a.performance?.annualizedReturn || a.expectedReturn || 0;
                const bPerf = b.performance?.annualizedReturn || b.expectedReturn || 0;
                return bPerf - aPerf;
              })
              .slice(0, 5);

            recommendations = {
              topMatches,
              searchSuggestions: generateSearchSuggestions(query, allAssets),
            };
          }

          const searchResponse: SearchResponse = {
            summary: {
              totalResults,
              platformsSearched: platformsToSearch.length,
              query,
              searchTimeMs: Date.now() - startTime,
            },
            results: searchResults,
            recommendations,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `🔍 Search Results for "${query}":\n\n${JSON.stringify(searchResponse, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error searching assets: ${error}`,
              },
            ],
          };
        }
      },
    );
  };

function getPlatformDisplayName(platform: PlatformType): string {
  const names = {
    splint_invest: "Splint Invest",
    masterworks: "Masterworks",
    realt: "RealT",
  };
  return names[platform] || platform;
}

function generateSearchSuggestions(query: string, assets: any[]): string[] {
  const suggestions: string[] = [];

  // Analyze asset categories and suggest related searches
  const categories = new Set();
  const regions = new Set();
  
  assets.forEach(asset => {
    if (asset.category) categories.add(asset.category);
    if (asset.region) regions.add(asset.region);
  });

  // Generate contextual suggestions
  if (categories.size > 0) {
    suggestions.push(`Try searching for: ${Array.from(categories).slice(0, 2).join(" or ")}`);
  }
  
  if (regions.size > 0) {
    suggestions.push(`Explore regional assets: ${Array.from(regions).slice(0, 2).join(" or ")}`);
  }

  // Generic suggestions based on query
  if (query.toLowerCase().includes("wine")) {
    suggestions.push("Try: 'vintage bordeaux', 'french wine', 'investment grade wine'");
  } else if (query.toLowerCase().includes("art")) {
    suggestions.push("Try: 'contemporary art', 'blue chip artists', 'emerging artists'");
  } else if (query.toLowerCase().includes("real estate")) {
    suggestions.push("Try: 'rental properties', 'commercial real estate', 'REITs'");
  }

  return suggestions.slice(0, 3);
}