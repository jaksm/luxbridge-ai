import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { PlatformType } from "@/lib/types/platformAsset";
import { SearchAssetsCrossPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "./lib/tools/templates/search-assets-cross-platform-tool-description.md",
  {},
);

export const registerSearchAssetsCrossPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "search_assets_cross_platform",
      DESCRIPTION,
      SearchAssetsCrossPlatformSchema.shape,
      async ({ sessionId, platforms, semanticQuery, limit = 10 }) => {
        try {
          const session = await getAuthSession(sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ Invalid or expired session. Please authenticate first.",
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
                sessionId,
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
