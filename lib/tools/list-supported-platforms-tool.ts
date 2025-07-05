import { SUPPORTED_PLATFORMS } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { ListSupportedPlatformsSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/list-supported-platforms-tool-description.md",
  {},
);

export const registerListSupportedPlatformsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "list_supported_platforms",
      DESCRIPTION,
      ListSupportedPlatformsSchema.shape,
      async ({ sessionId }) => {
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

          const platformStatus = SUPPORTED_PLATFORMS.map((platform) => {
            const link = session.platforms[platform.platform];
            return {
              platform: platform.platform,
              name: platform.name,
              description: platform.description,
              category: platform.category,
              isLinked: !!link,
              linkStatus: link?.status,
              lastUsed: link?.lastUsedAt,
            };
          });

          const linkedCount = platformStatus.filter((p) => p.isLinked).length;

          return {
            content: [
              {
                type: "text" as const,
                text: `📋 Supported RWA Platforms (${linkedCount}/${SUPPORTED_PLATFORMS.length} linked):\n\n${JSON.stringify(
                  {
                    platforms: platformStatus,
                    totalSupported: SUPPORTED_PLATFORMS.length,
                    linkedCount,
                  },
                  null,
                  2,
                )}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error listing platforms: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
