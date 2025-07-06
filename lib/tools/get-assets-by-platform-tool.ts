import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Retrieves all assets from a specific RWA platform with optional limit control. Returns a comprehensive list of available assets for browsing and selection.

<use-cases>
- Browse all assets: platform = "splint_invest", limit = 50 (default)
- Limited search: platform = "masterworks", limit = 10
- Platform overview: platform = "realt", limit = 100
- Asset discovery: Find available investments before detailed lookup
- Portfolio research: Explore platform offerings for investment decisions
</use-cases>

⚠️ IMPORTANT NOTES:

- Default limit is 50 assets to prevent overwhelming responses
- Maximum limit is 200 assets per request for performance
- Results are sorted by most recently added assets first
- Use semantic_search for filtering by investment criteria

Essential for discovering and browsing RWA assets available on each supported platform.
</description>`;

const GetAssetsByPlatformSchema = z.object({
  platform: z.enum(["splint_invest", "masterworks", "realt"]).describe("The platform to retrieve assets from"),
  limit: z.number().optional().default(50).describe("Maximum number of assets to return (default 50, max 200)")
});

export const registerGetAssetsByPlatformTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_assets_by_platform",
      DESCRIPTION,
      GetAssetsByPlatformSchema.shape,
      async ({ platform, limit = 50 }) => {
        // Mock platform-specific asset data
        const mockAssets: Record<string, any[]> = {
          splint_invest: [
            {
              assetId: "WINE-BORDEAUX-001",
              name: "Château Margaux 2019",
              category: "wine",
              subcategory: "bordeaux",
              region: "France",
              vintage: 2019,
              sharePrice: 85.00,
              totalShares: 10000,
              availableShares: 3245,
              minimumInvestment: 340.00,
              expectedReturn: 8.5,
              maturity: "5-15 years",
              riskLevel: "medium",
              storage: "Professional wine storage facility",
              certifications: ["Bordeaux Classification", "Organic"],
              performance: {
                oneYear: 6.2,
                threeYear: 23.1,
                annualizedReturn: 8.5
              },
              addedDate: "2024-01-15T00:00:00Z"
            },
            {
              assetId: "WINE-BURGUNDY-002",
              name: "Domaine de la Romanée-Conti 2020",
              category: "wine",
              subcategory: "burgundy",
              region: "France",
              vintage: 2020,
              sharePrice: 215.00,
              totalShares: 5000,
              availableShares: 892,
              minimumInvestment: 860.00,
              expectedReturn: 12.3,
              maturity: "8-20 years",
              riskLevel: "high",
              storage: "Climate-controlled wine cellar",
              certifications: ["DRC Estate", "Biodynamic"],
              performance: {
                oneYear: 8.7,
                threeYear: 28.4,
                annualizedReturn: 12.3
              },
              addedDate: "2024-01-12T00:00:00Z"
            },
            {
              assetId: "WINE-CHAMPAGNE-003",
              name: "Dom Pérignon 2012",
              category: "wine",
              subcategory: "champagne",
              region: "France",
              vintage: 2012,
              sharePrice: 42.00,
              totalShares: 25000,
              availableShares: 8934,
              minimumInvestment: 168.00,
              expectedReturn: 7.8,
              maturity: "3-10 years",
              riskLevel: "medium",
              storage: "Underground champagne cellars",
              certifications: ["Appellation Champagne", "Premium Cuvée"],
              performance: {
                oneYear: 5.4,
                threeYear: 18.9,
                annualizedReturn: 7.8
              },
              addedDate: "2024-01-10T00:00:00Z"
            }
          ],
          masterworks: [
            {
              assetId: "MONET-WL-2023-004",
              name: "Water Lilies Series - Nymphéas",
              category: "art",
              subcategory: "impressionist",
              artist: "Claude Monet",
              year: 1919,
              medium: "Oil on canvas",
              dimensions: "200 x 425 cm",
              sharePrice: 450.00,
              totalShares: 50000,
              availableShares: 12847,
              minimumInvestment: 2250.00,
              expectedReturn: 9.2,
              maturity: "3-10 years",
              riskLevel: "medium-high",
              storage: "Climate-controlled museum facility",
              certifications: ["Provenance Verified", "Museum Quality"],
              performance: {
                oneYear: 7.1,
                threeYear: 24.6,
                annualizedReturn: 9.2
              },
              addedDate: "2024-01-18T00:00:00Z"
            },
            {
              assetId: "PICASSO-042",
              name: "Femme au Béret Rouge",
              category: "art",
              subcategory: "modern",
              artist: "Pablo Picasso",
              year: 1937,
              medium: "Oil on canvas",
              dimensions: "73 x 60 cm",
              sharePrice: 620.00,
              totalShares: 30000,
              availableShares: 8453,
              minimumInvestment: 3100.00,
              expectedReturn: 11.5,
              maturity: "5-15 years",
              riskLevel: "high",
              storage: "Private collection vault",
              certifications: ["Authentication Certificate", "Blue Chip Artist"],
              performance: {
                oneYear: 9.3,
                threeYear: 31.2,
                annualizedReturn: 11.5
              },
              addedDate: "2024-01-16T00:00:00Z"
            },
            {
              assetId: "BASQUIAT-SK-001",
              name: "Untitled (Skull)",
              category: "art",
              subcategory: "contemporary",
              artist: "Jean-Michel Basquiat",
              year: 1981,
              medium: "Acrylic and oilstick on canvas",
              dimensions: "168 x 152 cm",
              sharePrice: 380.00,
              totalShares: 40000,
              availableShares: 15672,
              minimumInvestment: 1900.00,
              expectedReturn: 13.8,
              maturity: "2-8 years",
              riskLevel: "very-high",
              storage: "Modern art preservation facility",
              certifications: ["Estate Authenticated", "Contemporary Master"],
              performance: {
                oneYear: 12.4,
                threeYear: 38.7,
                annualizedReturn: 13.8
              },
              addedDate: "2024-01-14T00:00:00Z"
            }
          ],
          realt: [
            {
              assetId: "DETROIT-HOUSE-789",
              name: "1542 Riverside Dr, Detroit",
              category: "real_estate",
              subcategory: "residential",
              propertyType: "Single Family Home",
              location: "Detroit, MI",
              yearBuilt: 1925,
              squareFeet: 1680,
              bedrooms: 3,
              bathrooms: 2,
              sharePrice: 12.50,
              totalShares: 80000,
              availableShares: 23456,
              minimumInvestment: 50.00,
              expectedReturn: 11.5,
              maturity: "Long-term rental income",
              riskLevel: "medium",
              monthlyRent: 1200,
              annualYield: 11.52,
              occupancyRate: 92,
              storage: "Physical property",
              certifications: ["Property Deed", "Rental License"],
              performance: {
                oneYear: 4.2,
                threeYear: 15.8,
                annualizedReturn: 11.5
              },
              addedDate: "2024-01-08T00:00:00Z"
            },
            {
              assetId: "CHICAGO-MULTI-456",
              name: "2847 W Division St, Chicago",
              category: "real_estate",
              subcategory: "multi-family",
              propertyType: "Duplex",
              location: "Chicago, IL",
              yearBuilt: 1940,
              squareFeet: 2400,
              units: 2,
              sharePrice: 18.75,
              totalShares: 120000,
              availableShares: 34821,
              minimumInvestment: 75.00,
              expectedReturn: 9.8,
              maturity: "Long-term rental income",
              riskLevel: "medium-low",
              monthlyRent: 2600,
              annualYield: 9.84,
              occupancyRate: 95,
              storage: "Physical property",
              certifications: ["Multi-Unit License", "City Approved"],
              performance: {
                oneYear: 3.8,
                threeYear: 12.4,
                annualizedReturn: 9.8
              },
              addedDate: "2024-01-05T00:00:00Z"
            }
          ]
        };

        const platformAssets = mockAssets[platform] || [];
        const limitedAssets = platformAssets.slice(0, Math.min(limit, 200));

        return {
          content: [
            {
              type: "text" as const,
              text: `📊 **${platform.toUpperCase()} Platform Assets** (${limitedAssets.length} of ${platformAssets.length} total)\n\n**Platform Overview:**\n- Total Assets Available: ${platformAssets.length}\n- Showing: ${limitedAssets.length} assets\n- Platform: ${platform.replace('_', ' ').toUpperCase()}\n\n**Asset Summary:**\n${limitedAssets.map((asset, index) => `${index + 1}. **${asset.name}** (${asset.assetId})\n   - Category: ${asset.category}\n   - Share Price: $${asset.sharePrice}\n   - Expected Return: ${asset.expectedReturn}%\n   - Available Shares: ${asset.availableShares.toLocaleString()}\n   - Min Investment: $${asset.minimumInvestment}`).join('\n\n')}\n\n**Platform Assets Data:**\n${JSON.stringify({
                platform,
                totalAssets: platformAssets.length,
                assetsShown: limitedAssets.length,
                assets: limitedAssets
              }, null, 2)}`,
            },
          ],
        };
      },
    );
  };
