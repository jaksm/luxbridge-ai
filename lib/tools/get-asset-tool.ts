import { assetStorage } from "@/lib/storage/redisClient";
import { GetAssetSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Retrieves a specific asset from a RWA platform by platform and asset ID. Returns complete asset information including pricing, metadata, and platform-specific details.

<use-cases>
- Get single asset: platform = "splint_invest", assetId = "WINE-BORDEAUX-001"
- Fetch art piece: platform = "masterworks", assetId = "MONET-WL-2023-004"
- Lookup property: platform = "realt", assetId = "DETROIT-HOUSE-789"
- Asset verification: Validate existence before portfolio operations
- Price checking: Get current market values for specific assets
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns null if asset not found on the specified platform
- Asset IDs are case-sensitive and platform-specific
- Use get_assets_by_platform for browsing available assets first

Essential for retrieving detailed information about specific RWA assets across supported platforms.
</description>`;

export const registerGetAssetTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_asset",
      DESCRIPTION,
      GetAssetSchema.shape,
      async ({ platform, assetId }) => {
        try {
          const asset = await assetStorage.getAsset({ platform, assetId });
          if (!asset) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Asset not found: ${assetId} on platform ${platform}`,
                },
              ],
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(asset, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error retrieving asset: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
