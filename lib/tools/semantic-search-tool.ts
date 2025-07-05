import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticSearchSchema } from "@/lib/types/schemas";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Search for RWA assets using natural language queries across platforms. Uses AI-powered semantic search to find assets matching investment criteria and preferences.

<use-cases>
- Investment search: query = "high yield wine investments", platform = "splint_invest", limit = 5
- Art discovery: query = "modern contemporary paintings", platform = "masterworks", minScore = 0.7
- Property search: query = "rental properties Detroit", platform = "realt", limit = 10
- Cross-platform: query = "luxury collectibles", platform = null (searches all platforms)
- Risk-based: query = "low risk stable returns", minScore = 0.6, limit = 15
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty results if no assets match the semantic criteria
- Higher minScore values (0.7-1.0) return more precise matches
- Lower minScore values (0.1-0.3) return broader, more diverse results
- Platform parameter is optional - omit to search across all platforms

Essential for discovering RWA investment opportunities using natural language investment criteria.
</description>`;

export const registerSemanticSearchTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "semantic_search",
      DESCRIPTION,
      SemanticSearchSchema.shape,
      async ({ query, platform, limit = 10, minScore = 0.1 }) => {
        try {
          const semanticSearch = new SemanticAssetSearch();
          const assetIds = await semanticSearch.searchAssets({
            query,
            platform,
            limit,
            minScore,
          });

          if (assetIds.length === 0) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No assets found matching query: "${query}"`,
                },
              ],
            };
          }

          const assets = platform
            ? await assetStorage.getAssetsByIds(assetIds, platform)
            : [];

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${assets.length} assets matching "${query}":\n\n${JSON.stringify(assets, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error performing semantic search: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
