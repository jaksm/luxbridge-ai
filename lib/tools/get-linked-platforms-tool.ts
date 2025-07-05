import { getAuthSession } from "@/lib/auth/session-manager";
import { PlatformType } from "@/lib/types/platformAsset";
import { GetLinkedPlatformsSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Check status of linked platform accounts. Shows which RWA platforms are connected to the user's LuxBridge session with detailed connection information.

<use-cases>
- Connection status: sessionId = "session_123" (view all linked platform accounts)
- Account verification: Check if specific platforms are properly connected
- Session management: Review active vs expired platform connections
- Troubleshooting: Identify authentication issues with specific platforms
- Portfolio readiness: Confirm platforms are linked before portfolio operations
</use-cases>

⚠️ IMPORTANT NOTES:

- Shows detailed status including active, expired, and failed connections
- Displays platform-specific user IDs and last usage timestamps
- Connection status affects availability of cross-platform features
- Use generate_platform_auth_links to reconnect expired platforms

Essential for managing and monitoring cross-platform account connections and authentication status.
</description>`;

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
