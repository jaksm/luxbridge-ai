import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { assetStorage } from "@/lib/storage/redisClient";
import { GetAssetsByPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "./lib/tools/templates/get-assets-by-platform-tool-description.md",
  {},
);

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
