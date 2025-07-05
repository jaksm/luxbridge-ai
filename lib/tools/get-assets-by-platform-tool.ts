import { assetStorage } from "@/lib/storage/redisClient";
import { GetAssetsByPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Retrieves all assets from a specific RWA platform with optional limit control. Returns a comprehensive list of available assets for browsing and selection.

<use-cases>
- Browse all assets: platform = "splint_invest", limit = 50 (default)
- Limited search: platform = "masterworks", limit = 10
- Platform overview: platform = "realt", limit = 100
- Asset discovery: Find available investments before detailed lookup
- Portfolio research: Explore platform offerings for investment decisions
</use-cases>

⚠️ IMPORTANT NOTES:

- Default limit is 50 assets to prevent overwhelming responses
- Maximum limit is 200 assets per request for performance
- Results are sorted by most recently added assets first
- Use semantic_search for filtering by investment criteria

Essential for discovering and browsing RWA assets available on each supported platform.
</description>`;

export const registerGetAssetsByPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_assets_by_platform",
      DESCRIPTION,
      GetAssetsByPlatformSchema.shape,
      async ({ platform, limit = 50 }) => {
        try {
          const assets = await assetStorage.getAssetsByPlatform({
            platform,
            limit,
          });
          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${assets.length} assets on ${platform}:\n\n${JSON.stringify(assets, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error retrieving assets: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
