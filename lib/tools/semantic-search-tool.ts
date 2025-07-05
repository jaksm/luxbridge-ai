import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticSearchSchema } from "@/lib/types/schemas";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "./lib/tools/templates/semantic-search-tool-description.md",
  {},
);

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
