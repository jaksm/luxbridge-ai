import { getAuthSession } from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { PlatformType } from "@/lib/types/platformAsset";
import { GetLinkedPlatformsSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/get-linked-platforms-tool-description.md",
  {},
);

export const registerGetLinkedPlatformsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_linked_platforms",
      DESCRIPTION,
      GetLinkedPlatformsSchema.shape,
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

          const linkedPlatforms = Object.entries(session.platforms)
            .filter(([_, link]) => link !== null)
            .map(([platform, link]) => ({
              platform: platform as PlatformType,
              status: link!.status,
              platformEmail: link!.platformEmail,
              linkedAt: link!.linkedAt,
              lastUsed: link!.lastUsedAt,
            }));

          const summary = {
            totalLinked: linkedPlatforms.length,
            activeCount: linkedPlatforms.filter((p) => p.status === "active")
              .length,
            expiredCount: linkedPlatforms.filter((p) => p.status === "expired")
              .length,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `🔗 Linked Platform Accounts:\n\n${JSON.stringify({ linkedPlatforms, summary }, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error getting linked platforms: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
