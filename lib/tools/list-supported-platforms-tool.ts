import { SUPPORTED_PLATFORMS } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { ListSupportedPlatformsSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Get list of RWA platforms supported by LuxBridge with connection status. Shows which platforms are available for linking and their current authentication state.

<use-cases>
- Platform discovery: View all available RWA platforms
- Connection status: Check which platforms are already linked to user account
- Integration planning: See supported platforms before authentication setup
- Account management: Review linked vs unlinked platform accounts
- Feature exploration: Understand LuxBridge's platform coverage
</use-cases>

⚠️ IMPORTANT NOTES:

- Automatically uses your authenticated session
- Shows both linked and unlinked platforms with status indicators
- Platform availability may vary by user region and verification level
- Use generate_platform_auth_links to connect unlinked platforms

Essential for understanding platform integration capabilities and managing cross-platform connections.
</description>`;

export const registerListSupportedPlatformsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "list_supported_platforms",
      DESCRIPTION,
      ListSupportedPlatformsSchema.shape,
      async () => {
        try {
          // Get sessionId from access token
          if (!accessToken.sessionId) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ No active session found. This may be due to an older authentication. Please reconnect to create a new session.",
                },
              ],
            };
          }

          const session = await getAuthSession(accessToken.sessionId);
          if (!session) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ Invalid or expired session. Please reconnect to refresh your session.",
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
