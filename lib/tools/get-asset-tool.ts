import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { assetStorage } from "@/lib/storage/redisClient";
import { GetAssetSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/get-asset-tool-description.md",
  {},
);

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
