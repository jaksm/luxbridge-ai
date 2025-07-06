import { RegisterTool } from "./types";
import { z } from "zod";

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

const ListSupportedPlatformsSchema = z.object({}).describe("No parameters required");

export const registerListSupportedPlatformsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "list_supported_platforms",
      DESCRIPTION,
      ListSupportedPlatformsSchema.shape,
      async () => {
        // Mock comprehensive platform data
        const mockPlatforms = [
          {
            platform: "splint_invest",
            name: "Splint Invest",
            description: "Premium wine investments with fractional ownership of rare vintages and collectible bottles",
            category: "Wine & Spirits",
            isLinked: true,
            linkStatus: "active",
            lastUsed: "2024-01-20T16:30:00Z",
            features: ["Wine Portfolios", "Vintage Analysis", "Storage & Insurance", "Market Analytics"],
            assetTypes: ["Bordeaux", "Burgundy", "Champagne", "Rare Spirits"],
            minimumInvestment: 250,
            averageReturn: "8-15% annually",
            maturityPeriod: "5-15 years"
          },
          {
            platform: "masterworks",
            name: "Masterworks",
            description: "Blue-chip art investments from renowned artists with professional curation and storage",
            category: "Fine Art",
            isLinked: true,
            linkStatus: "active", 
            lastUsed: "2024-01-20T16:28:00Z",
            features: ["Blue-Chip Artists", "Art Analytics", "Professional Storage", "Expert Curation"],
            assetTypes: ["Contemporary", "Modern", "Impressionist", "Post-War"],
            minimumInvestment: 1000,
            averageReturn: "7.5% annually",
            maturityPeriod: "3-10 years"
          },
          {
            platform: "realt",
            name: "RealT",
            description: "Tokenized real estate investments with rental income and property appreciation",
            category: "Real Estate",
            isLinked: false,
            linkStatus: "disconnected",
            lastUsed: null,
            features: ["Rental Income", "Property Tokens", "Global Properties", "Passive Income"],
            assetTypes: ["Residential", "Commercial", "Multi-Family", "REITs"],
            minimumInvestment: 50,
            averageReturn: "8-12% annually",
            maturityPeriod: "Long-term holdings"
          }
        ];

        const linkedCount = mockPlatforms.filter(p => p.isLinked).length;
        const totalPlatforms = mockPlatforms.length;

        return {
          content: [
            {
              type: "text" as const,
              text: `🏢 **LuxBridge Supported RWA Platforms** (${linkedCount}/${totalPlatforms} connected)\n\n**Platform Overview:**\n${mockPlatforms.map(platform => `\n**${platform.name}** (${platform.platform})\n${platform.isLinked ? '✅ Connected' : '❌ Not Connected'} - ${platform.category}\n📝 ${platform.description}\n💰 Min Investment: $${platform.minimumInvestment.toLocaleString()}\n📈 Expected Return: ${platform.averageReturn}\n⏱️ Typical Hold: ${platform.maturityPeriod}\n🎯 Asset Types: ${platform.assetTypes.join(', ')}\n✨ Key Features: ${platform.features.join(', ')}${platform.lastUsed ? `\n🕐 Last Used: ${new Date(platform.lastUsed).toLocaleString()}` : ''}`).join('\n')}\n\n**Platform Connection Summary:**\n- **Total Supported Platforms:** ${totalPlatforms}\n- **Currently Connected:** ${linkedCount}\n- **Available to Connect:** ${totalPlatforms - linkedCount}\n\n**Next Steps:**\n${linkedCount < totalPlatforms ? '🔗 Use generate_platform_auth_links to connect additional platforms' : '✅ All platforms connected! You have full access to the LuxBridge ecosystem'}\n\n**Complete Platform Data:**\n${JSON.stringify({
                platforms: mockPlatforms,
                summary: {
                  totalSupported: totalPlatforms,
                  linkedCount,
                  availableToConnect: totalPlatforms - linkedCount,
                  connectionRate: `${Math.round((linkedCount / totalPlatforms) * 100)}%`
                }
              }, null, 2)}`,
            },
          ],
        };
      },
    );
  };
