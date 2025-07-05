import { SUPPORTED_PLATFORMS } from "@/lib/auth/platform-auth";
import { getAuthSession } from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { GeneratePlatformAuthLinksSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "./lib/tools/templates/generate-platform-auth-links-tool-description.md",
  {},
);

export const registerGeneratePlatformAuthLinksTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "generate_platform_auth_links",
      DESCRIPTION,
      GeneratePlatformAuthLinksSchema.shape,
      async ({ sessionId, platforms }) => {
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

          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

          const authLinks = platforms.map((platform) => ({
            platform,
            authUrl: `${baseUrl}/auth/${platform.replace("_", "-")}?session=${sessionId}`,
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
