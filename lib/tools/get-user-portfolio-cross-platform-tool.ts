import { makeAuthenticatedPlatformCall } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { GetUserPortfolioCrossPlatformSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/get-user-portfolio-cross-platform-tool-description.md",
  {},
);

export const registerGetUserPortfolioCrossPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_user_portfolio_cross_platform",
      DESCRIPTION,
      GetUserPortfolioCrossPlatformSchema.shape,
      async ({ sessionId, platform }) => {
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
            sessionId,
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
