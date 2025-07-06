import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Check status of linked platform accounts. Shows which RWA platforms are connected to the user's LuxBridge session with detailed connection information.

<use-cases>
- Connection status: View all linked platform accounts
- Account verification: Check if specific platforms are properly connected
- Session management: Review active vs expired platform connections
- Troubleshooting: Identify authentication issues with specific platforms
- Portfolio readiness: Confirm platforms are linked before portfolio operations
</use-cases>

⚠️ IMPORTANT NOTES:

- Automatically uses your authenticated session
- Shows detailed status including active, expired, and failed connections
- Displays platform-specific user IDs and last usage timestamps
- Connection status affects availability of cross-platform features
- Use generate_platform_auth_links to reconnect expired platforms

Essential for managing and monitoring cross-platform account connections and authentication status.
</description>`;

const GetLinkedPlatformsSchema = z.object({}).describe("No parameters required");

export const registerGetLinkedPlatformsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_linked_platforms",
      DESCRIPTION,
      GetLinkedPlatformsSchema.shape,
      async () => {
        // Mock realistic linked platform data
        const mockLinkedPlatforms = [
          {
            platform: "splint_invest",
            platformName: "Splint Invest",
            status: "active",
            platformEmail: "investor@luxbridge.ai",
            platformUserId: "splint_user_456",
            linkedAt: "2024-01-18T09:15:00Z",
            lastUsed: "2024-01-20T16:30:00Z",
            connectionType: "OAuth 2.0",
            permissions: ["read:portfolio", "read:assets", "write:trades"],
            healthStatus: "excellent",
            dataSync: {
              lastSync: "2024-01-20T16:30:00Z",
              syncFrequency: "real-time",
              syncStatus: "up-to-date"
            },
            features: {
              portfolioAccess: true,
              tradingEnabled: true,
              historicalData: true,
              realTimeUpdates: true
            },
            category: "Wine & Spirits"
          },
          {
            platform: "masterworks",
            platformName: "Masterworks",
            status: "active",
            platformEmail: "investor@luxbridge.ai",
            platformUserId: "mw_789abc",
            linkedAt: "2024-01-19T11:45:00Z",
            lastUsed: "2024-01-20T16:28:00Z",
            connectionType: "OAuth 2.0",
            permissions: ["read:portfolio", "read:assets", "read:analytics"],
            healthStatus: "excellent",
            dataSync: {
              lastSync: "2024-01-20T16:28:00Z",
              syncFrequency: "every 15 minutes",
              syncStatus: "up-to-date"
            },
            features: {
              portfolioAccess: true,
              tradingEnabled: true,
              historicalData: true,
              realTimeUpdates: true
            },
            category: "Fine Art"
          },
          {
            platform: "realt",
            platformName: "RealT",
            status: "disconnected",
            platformEmail: null,
            platformUserId: null,
            linkedAt: null,
            lastUsed: null,
            connectionType: null,
            permissions: [],
            healthStatus: "not-connected",
            dataSync: {
              lastSync: null,
              syncFrequency: "not-applicable",
              syncStatus: "not-connected"
            },
            features: {
              portfolioAccess: false,
              tradingEnabled: false,
              historicalData: false,
              realTimeUpdates: false
            },
            category: "Real Estate"
          }
        ];

        const activeCount = mockLinkedPlatforms.filter(p => p.status === "active").length;
        const totalPlatforms = mockLinkedPlatforms.length;
        const disconnectedCount = mockLinkedPlatforms.filter(p => p.status === "disconnected").length;
        const sessionId = accessToken.sessionId || "session_789xyz";

        return {
          content: [
            {
              type: "text" as const,
              text: `🔗 **Platform Connection Status** (${activeCount}/${totalPlatforms} active)\n\n**Session Information:**\n- Session ID: ${sessionId}\n- User: ${accessToken.userId}\n- Connection Health: ${activeCount === totalPlatforms ? 'Excellent' : activeCount > 0 ? 'Partial' : 'No Connections'}\n\n**Platform Details:**\n${mockLinkedPlatforms.map(platform => `\n**${platform.platformName}** (${platform.platform})\n${platform.status === 'active' ? '✅ Active Connection' : platform.status === 'expired' ? '⚠️ Expired Connection' : '❌ Not Connected'} - ${platform.category}\n${platform.status === 'active' ? `📧 Email: ${platform.platformEmail}\n🆔 Platform ID: ${platform.platformUserId}\n🔗 Connected: ${new Date(platform.linkedAt!).toLocaleDateString()}\n🕐 Last Used: ${new Date(platform.lastUsed!).toLocaleString()}\n🔄 Data Sync: ${platform.dataSync.syncStatus} (${platform.dataSync.syncFrequency})\n🔒 Permissions: ${platform.permissions.join(', ')}\n✨ Features: Portfolio ${platform.features.portfolioAccess ? '✅' : '❌'}, Trading ${platform.features.tradingEnabled ? '✅' : '❌'}, Real-time ${platform.features.realTimeUpdates ? '✅' : '❌'}` : '🔗 Use generate_platform_auth_links to connect this platform'}`).join('\n')}\n\n**Connection Summary:**\n- **Active Connections:** ${activeCount}\n- **Disconnected Platforms:** ${disconnectedCount}\n- **Overall Health:** ${activeCount === totalPlatforms ? '✅ All platforms connected' : `⚠️ ${disconnectedCount} platform(s) need connection`}\n- **Portfolio Access:** ${activeCount > 0 ? `✅ Available across ${activeCount} platform(s)` : '❌ No portfolio access - connect platforms first'}\n\n**Next Steps:**\n${disconnectedCount > 0 ? `🔗 Connect remaining platforms using generate_platform_auth_links([${mockLinkedPlatforms.filter(p => p.status === 'disconnected').map(p => `"${p.platform}"`).join(', ')}])` : '✅ All platforms connected! Full LuxBridge functionality available'}\n\n**Complete Platform Data:**\n${JSON.stringify({
                linkedPlatforms: mockLinkedPlatforms,
                summary: {
                  totalPlatforms,
                  activeCount,
                  disconnectedCount,
                  expiredCount: 0,
                  connectionRate: `${Math.round((activeCount / totalPlatforms) * 100)}%`,
                  overallHealth: activeCount === totalPlatforms ? 'excellent' : activeCount > 0 ? 'partial' : 'poor',
                  sessionId
                }
              }, null, 2)}`,
            },
          ],
        };
      },
    );
  };
