import { SUPPORTED_PLATFORMS } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { GeneratePlatformAuthLinksSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Generate authentication links for specified platforms. Creates time-limited URLs that users can visit to link their platform accounts to LuxBridge.

<use-cases>
- Single platform: platforms = ["splint_invest"]
- Multiple platforms: platforms = ["masterworks", "realt"]
- Portfolio setup: Generate auth links for all desired investment platforms
- Account linking: Create secure URLs for platform OAuth flows
- Re-authentication: Generate new links when platform tokens expire
</use-cases>

🚨 CRITICAL WARNINGS:

- Authentication links expire in 10 minutes for security
- Automatically uses your authenticated session
- Each platform requires separate authentication flow completion

⚠️ IMPORTANT NOTES:

- Generated URLs redirect to platform-specific OAuth flows
- Users must complete authentication on each platform individually
- Successful linking enables cross-platform portfolio operations

Essential for connecting external RWA platform accounts to LuxBridge for unified portfolio management.
</description>`;

export const registerGeneratePlatformAuthLinksTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "generate_platform_auth_links",
      DESCRIPTION,
      GeneratePlatformAuthLinksSchema.shape,
      async ({ platforms }) => {
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

          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

          const authLinks = platforms.map((platform) => ({
            platform,
            authUrl: `${baseUrl}/auth/${platform.replace("_", "-")}?session=${accessToken.sessionId}`,
            expiresAt,
            instructions: `Click the link to authenticate with ${SUPPORTED_PLATFORMS.find((p) => p.platform === platform)?.name || platform}`,
          }));

          return {
            content: [
              {
                type: "text" as const,
                text: `🔗 Platform Authentication Links:\n\n${JSON.stringify(
                  {
                    authLinks,
                    sessionExpiresAt: session.expiresAt,
                    instructions:
                      "Visit each link to authenticate with the respective platform. Links expire in 10 minutes.",
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
                text: `❌ Error generating auth links: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
