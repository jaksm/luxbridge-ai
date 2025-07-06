import { RegisterTool } from "./types";
import { z } from "zod";

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

const GeneratePlatformAuthLinksSchema = z.object({
  platforms: z.array(z.enum(["splint_invest", "masterworks", "realt"])).describe("List of platforms to generate auth links for")
});

export const registerGeneratePlatformAuthLinksTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "generate_platform_auth_links",
      DESCRIPTION,
      GeneratePlatformAuthLinksSchema.shape,
      async ({ platforms }) => {
        // Mock platform information
        const platformInfo: Record<string, any> = {
          splint_invest: {
            name: "Splint Invest",
            category: "Wine & Spirits",
            description: "Premium wine investments",
            isConnected: true
          },
          masterworks: {
            name: "Masterworks", 
            category: "Fine Art",
            description: "Blue-chip art investments",
            isConnected: true
          },
          realt: {
            name: "RealT",
            category: "Real Estate",
            description: "Tokenized real estate",
            isConnected: false
          }
        };

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://luxbridge-ai.vercel.app";
        const sessionId = accessToken.sessionId || "session_789xyz";
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const authLinks = platforms.map((platform) => {
          const info = platformInfo[platform];
          const isAlreadyConnected = info?.isConnected;
          
          return {
            platform,
            platformName: info?.name || platform,
            category: info?.category,
            description: info?.description,
            authUrl: `${baseUrl}/auth/${platform.replace("_", "-")}?session=${sessionId}`,
            registrationUrl: `${baseUrl}/auth/${platform.replace("_", "-")}/register?session=${sessionId}`,
            isAlreadyConnected,
            status: isAlreadyConnected ? "Connected - Ready to use" : "Not connected - Authentication required",
            expiresAt,
            estimatedTime: "2-3 minutes per platform",
            requiredInfo: ["Email address", "Platform password", "Account verification"],
            instructions: isAlreadyConnected 
              ? `${info.name} is already connected and ready to use!`
              : `Click the auth link to connect your ${info.name} account. If you don't have an account, use the registration link first.`
          };
        });

        const connectedCount = authLinks.filter(link => link.isAlreadyConnected).length;
        const needsConnectionCount = authLinks.length - connectedCount;

        return {
          content: [
            {
              type: "text" as const,
              text: `🔗 **Platform Authentication Links Generated**\n\n**Session Information:**\n- Session ID: ${sessionId}\n- Links Expire: ${new Date(expiresAt).toLocaleString()}\n- Status: ${connectedCount}/${authLinks.length} platforms already connected\n\n**Platform Links:**\n${authLinks.map(link => `\n**${link.platformName}** (${link.platform})\n${link.isAlreadyConnected ? '✅ Already Connected' : '🔗 Needs Connection'} - ${link.category}\n📝 ${link.description}\n📊 Status: ${link.status}\n${!link.isAlreadyConnected ? `🔗 **Auth Link:** ${link.authUrl}\n🆕 **Register Link:** ${link.registrationUrl}\n⏱️ Estimated Time: ${link.estimatedTime}\n📋 Required: ${link.requiredInfo.join(', ')}` : '✨ Ready for portfolio operations!'}\n📄 ${link.instructions}`).join('\n')}\n\n**Next Steps:**\n${needsConnectionCount > 0 ? `🔴 ${needsConnectionCount} platform(s) need connection:\n${authLinks.filter(l => !l.isAlreadyConnected).map(l => `1. Visit ${l.platformName} auth link above\n2. Complete authentication or registration\n3. Return to LuxBridge for portfolio access`).join('\n')}` : '✅ All requested platforms are connected!'}\n\n**Security Notes:**\n⏰ Links expire in 10 minutes for security\n🔒 Session-based authentication preserves your login\n🔄 You can regenerate links if they expire\n\n**Complete Auth Data:**\n${JSON.stringify({
                authLinks,
                summary: {
                  totalPlatforms: authLinks.length,
                  alreadyConnected: connectedCount,
                  needsConnection: needsConnectionCount,
                  sessionId,
                  expiresAt,
                  baseUrl
                }
              }, null, 2)}`,
            },
          ],
        };
      },
    );
  };
