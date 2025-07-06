import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Retrieves a specific asset from a RWA platform by platform and asset ID. Returns complete asset information including pricing, metadata, and platform-specific details.

<use-cases>
- Get single asset: platform = "splint_invest", assetId = "WINE-BORDEAUX-001"
- Fetch art piece: platform = "masterworks", assetId = "MONET-WL-2023-004"
- Lookup property: platform = "realt", assetId = "DETROIT-HOUSE-789"
- Asset verification: Validate existence before portfolio operations
- Price checking: Get current market values for specific assets
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns null if asset not found on the specified platform
- Asset IDs are case-sensitive and platform-specific
- Use get_assets_by_platform for browsing available assets first

Essential for retrieving detailed information about specific RWA assets across supported platforms.
</description>`;

const GetAssetSchema = z.object({
  platform: z.enum(["splint_invest", "masterworks", "realt"]).describe("The platform where the asset is hosted"),
  assetId: z.string().describe("Unique identifier for the asset on the platform")
});

export const registerGetAssetTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_asset",
      DESCRIPTION,
      GetAssetSchema.shape,
      async ({ platform, assetId }) => {
        // Mock realistic asset data based on platform
        const mockAssets: Record<string, Record<string, any>> = {
          splint_invest: {
            "WINE-BORDEAUX-001": {
              assetId: "WINE-BORDEAUX-001",
              platform: "splint_invest",
              name: "Château Margaux 2019",
              category: "wine",
              subcategory: "bordeaux",
              description: "Premium Bordeaux from one of the most prestigious châteaux in the Médoc region",
              vintage: 2019,
              region: "Margaux, Bordeaux, France",
              currentPrice: 850.00,
              sharePrice: 85.00,
              totalShares: 1000,
              availableShares: 342,
              minInvestment: 85.00,
              expectedYield: 12.5,
              riskLevel: "moderate",
              maturityDate: "2029-12-31",
              expertRating: 95,
              provenance: "Verified by Chai Consulting",
              storage: "Professional bonded warehouse, London",
              insurance: "Fully insured by Lloyd's of London",
              lastValuation: "2024-01-15T00:00:00Z",
              priceHistory: [
                { date: "2024-01-01", price: 820.00 },
                { date: "2024-01-15", price: 850.00 }
              ],
              keyMetrics: {
                totalReturn: 3.66,
                annualizedReturn: 14.6,
                volatility: 18.2,
                sharpeRatio: 0.8
              }
            },
            "WINE-BURGUNDY-002": {
              assetId: "WINE-BURGUNDY-002",
              platform: "splint_invest",
              name: "Domaine de la Romanée-Conti 2020",
              category: "wine",
              subcategory: "burgundy",
              description: "Exceptional Burgundy from the most legendary vineyard in Burgundy",
              vintage: 2020,
              region: "Vosne-Romanée, Burgundy, France",
              currentPrice: 2150.00,
              sharePrice: 215.00,
              totalShares: 500,
              availableShares: 127,
              minInvestment: 215.00,
              expectedYield: 18.5,
              riskLevel: "high",
              maturityDate: "2035-12-31",
              expertRating: 98,
              provenance: "Direct from domaine",
              storage: "Climate-controlled facility, Geneva",
              insurance: "Comprehensive fine wine insurance",
              lastValuation: "2024-01-18T00:00:00Z",
              priceHistory: [
                { date: "2024-01-01", price: 2100.00 },
                { date: "2024-01-18", price: 2150.00 }
              ],
              keyMetrics: {
                totalReturn: 2.38,
                annualizedReturn: 19.8,
                volatility: 25.4,
                sharpeRatio: 0.78
              }
            }
          },
          masterworks: {
            "MONET-WL-2023-004": {
              assetId: "MONET-WL-2023-004",
              platform: "masterworks",
              name: "Water Lilies Series - Nymphéas",
              category: "art",
              subcategory: "impressionist",
              artist: "Claude Monet",
              year: 1919,
              medium: "Oil on canvas",
              dimensions: "130 x 200 cm",
              description: "Masterpiece from Monet's renowned Water Lilies series, painted at Giverny",
              currentPrice: 4500000.00,
              sharePrice: 450.00,
              totalShares: 10000,
              availableShares: 2341,
              minInvestment: 450.00,
              expectedYield: 8.5,
              riskLevel: "moderate",
              provenance: "Previously owned by private collector, exhibited at MoMA",
              authentication: "Verified by Wildenstein Institute",
              condition: "Excellent - professionally restored in 2018",
              insurance: "Secured by specialist fine art insurer",
              location: "Freeport storage facility, Singapore",
              lastValuation: "2024-01-10T00:00:00Z",
              priceHistory: [
                { date: "2023-12-01", price: 4200000.00 },
                { date: "2024-01-10", price: 4500000.00 }
              ],
              keyMetrics: {
                totalReturn: 7.14,
                annualizedReturn: 8.7,
                volatility: 12.3,
                sharpeRatio: 0.71
              },
              marketComparables: [
                { artist: "Claude Monet", work: "Meules (Haystacks)", salePrice: 5200000, year: 2023 },
                { artist: "Claude Monet", work: "Cathédrale de Rouen", salePrice: 3800000, year: 2023 }
              ]
            },
            "PICASSO-042": {
              assetId: "PICASSO-042",
              platform: "masterworks",
              name: "Femme au Béret Rouge",
              category: "art",
              subcategory: "modern",
              artist: "Pablo Picasso",
              year: 1937,
              medium: "Oil on canvas",
              dimensions: "92 x 73 cm",
              description: "Striking portrait from Picasso's mature period, depicting Marie-Thérèse Walter",
              currentPrice: 6200000.00,
              sharePrice: 620.00,
              totalShares: 10000,
              availableShares: 1876,
              minInvestment: 620.00,
              expectedYield: 11.2,
              riskLevel: "moderate",
              provenance: "Estate of the artist, acquired by current owner in 1975",
              authentication: "Picasso Administration authentication",
              condition: "Very good - minor restoration in 2015",
              insurance: "Lloyd's of London fine art policy",
              location: "Bonded warehouse, New York",
              lastValuation: "2024-01-12T00:00:00Z",
              priceHistory: [
                { date: "2023-11-01", price: 5800000.00 },
                { date: "2024-01-12", price: 6200000.00 }
              ],
              keyMetrics: {
                totalReturn: 6.90,
                annualizedReturn: 11.4,
                volatility: 15.8,
                sharpeRatio: 0.72
              },
              marketComparables: [
                { artist: "Pablo Picasso", work: "Les Femmes d'Alger", salePrice: 8500000, year: 2023 },
                { artist: "Pablo Picasso", work: "Portrait de Dora Maar", salePrice: 5200000, year: 2023 }
              ]
            }
          },
          realt: {
            "DETROIT-HOUSE-789": {
              assetId: "DETROIT-HOUSE-789",
              platform: "realt",
              name: "1542 Riverside Dr, Detroit",
              category: "real_estate",
              subcategory: "residential",
              propertyType: "Single family home",
              bedrooms: 3,
              bathrooms: 2,
              squareFeet: 1650,
              lotSize: 0.25,
              yearBuilt: 1952,
              address: "1542 Riverside Dr, Detroit, MI 48207",
              neighborhood: "Riverfront District",
              description: "Renovated single-family home in up-and-coming Detroit neighborhood",
              currentPrice: 125000.00,
              sharePrice: 12.50,
              totalShares: 10000,
              availableShares: 3456,
              minInvestment: 12.50,
              monthlyRent: 1200.00,
              expectedYield: 11.52,
              riskLevel: "moderate",
              tenant: "Occupied - verified tenant",
              leaseExpiry: "2024-12-31",
              propertyManager: "Detroit Property Management LLC",
              insurance: "Landlord insurance policy active",
              taxes: 2400.00,
              maintenance: "Professional property management",
              lastValuation: "2024-01-08T00:00:00Z",
              priceHistory: [
                { date: "2023-12-01", price: 120000.00 },
                { date: "2024-01-08", price: 125000.00 }
              ],
              keyMetrics: {
                totalReturn: 4.17,
                annualizedReturn: 11.8,
                volatility: 8.5,
                sharpeRatio: 1.39,
                capRate: 9.6,
                grossRentMultiplier: 8.68
              },
              marketComparables: [
                { address: "1556 Riverside Dr", price: 128000, sqft: 1720, type: "similar" },
                { address: "1538 Riverside Dr", price: 118000, sqft: 1580, type: "similar" }
              ]
            },
            "CHICAGO-001": {
              assetId: "CHICAGO-001",
              platform: "realt",
              name: "2847 W Washington Blvd, Chicago",
              category: "real_estate",
              subcategory: "residential",
              propertyType: "Multi-family duplex",
              bedrooms: 6,
              bathrooms: 4,
              squareFeet: 2850,
              lotSize: 0.15,
              yearBuilt: 1925,
              address: "2847 W Washington Blvd, Chicago, IL 60612",
              neighborhood: "West Town",
              description: "Historic duplex in gentrifying West Town neighborhood",
              currentPrice: 385000.00,
              sharePrice: 38.50,
              totalShares: 10000,
              availableShares: 2178,
              minInvestment: 38.50,
              monthlyRent: 3200.00,
              expectedYield: 9.97,
              riskLevel: "moderate",
              tenant: "Both units occupied",
              leaseExpiry: "2024-08-31",
              propertyManager: "Chicago Real Estate Partners",
              insurance: "Commercial property insurance",
              taxes: 8500.00,
              maintenance: "Professional building maintenance",
              lastValuation: "2024-01-16T00:00:00Z",
              priceHistory: [
                { date: "2023-11-01", price: 375000.00 },
                { date: "2024-01-16", price: 385000.00 }
              ],
              keyMetrics: {
                totalReturn: 2.67,
                annualizedReturn: 10.2,
                volatility: 6.8,
                sharpeRatio: 1.50,
                capRate: 8.4,
                grossRentMultiplier: 10.03
              },
              marketComparables: [
                { address: "2851 W Washington Blvd", price: 395000, sqft: 2920, type: "similar" },
                { address: "2839 W Washington Blvd", price: 365000, sqft: 2780, type: "similar" }
              ]
            }
          }
        };

        const asset = mockAssets[platform]?.[assetId];
        
        if (!asset) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Asset not found: ${assetId} on platform ${platform}\n\nAvailable assets on ${platform}:\n${Object.keys(mockAssets[platform] || {}).join(", ") || "No assets available"}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `✅ Asset Found: ${asset.name}\n\n**Asset Details:**\n- Platform: ${asset.platform}\n- Category: ${asset.category}\n- Current Price: $${asset.currentPrice.toLocaleString()}\n- Share Price: $${asset.sharePrice}\n- Available Shares: ${asset.availableShares.toLocaleString()}\n- Expected Yield: ${asset.expectedYield}%\n- Risk Level: ${asset.riskLevel}\n\n**Full Asset Data:**\n${JSON.stringify(asset, null, 2)}`,
            },
          ],
        };
      },
    );
  };
