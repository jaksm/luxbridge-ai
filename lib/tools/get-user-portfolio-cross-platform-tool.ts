import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { GetUserPortfolioCrossPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Retrieve user portfolio from specified platform using stored credentials. Fetches real-time portfolio data directly from linked platform accounts.

<use-cases>
- Live portfolio: platform = "splint_invest"
- Account sync: platform = "masterworks"
- Portfolio refresh: platform = "realt"
- Investment tracking: Get current holdings and valuations from platform
- Performance monitoring: Retrieve updated portfolio metrics and returns
</use-cases>

🚨 CRITICAL WARNINGS:

- Requires active platform connection with valid authentication
- Platform must be linked and credentials must be current
- Failed authentication will return connection error

⚠️ IMPORTANT NOTES:

- Automatically uses your authenticated session
- Returns real-time data directly from platform APIs
- Portfolio values reflect current market conditions
- Platform-specific user credentials are automatically used
- Connection status is validated before API calls

Essential for accessing live portfolio data from connected RWA platform accounts.
</description>`;

export const registerGetUserPortfolioCrossPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_user_portfolio_cross_platform",
      DESCRIPTION,
      GetUserPortfolioCrossPlatformSchema.shape,
      async ({ platform }) => {
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

          const platformLink = session.platforms[platform];
          if (!platformLink || platformLink.status !== "active") {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Platform ${platform} not linked or inactive. Please link your account first.`,
                },
              ],
            };
          }

          const portfolio = await makeAuthenticatedPlatformCall(
            accessToken.sessionId,
            platform,
            "/portfolio",
          );

          const response = {
            platform,
            portfolio,
            metadata: {
              retrievedAt: new Date().toISOString(),
              platformUserId: platformLink.platformUserId,
              credentialStatus: platformLink.status,
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `📊 Portfolio from ${platform}:\n\n${JSON.stringify(response, null, 2)}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Error retrieving portfolio: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
