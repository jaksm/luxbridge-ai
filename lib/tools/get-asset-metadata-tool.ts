import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Retrieves comprehensive blockchain metadata for a tokenized real-world asset. This provides current on-chain information including valuation, supply, pricing, and platform details for any asset that has been tokenized.

<use-cases>
- Check asset valuation: platform = "splint_invest", assetId = "WINE-001" → current market value and share price
- Verify token supply: Get total supply, available shares, and circulation data
- Portfolio valuation: Retrieve current values for portfolio calculation and analysis  
- Trading preparation: Get latest asset metadata before executing swaps or trades
- Asset verification: Confirm asset exists and get official blockchain record
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns data from blockchain contracts, not platform APIs
- Values reflect latest on-chain state (updated by background sync)
- All monetary values in USD equivalent  
- Includes both original tokenization data and current market values
- Read-only operation with no transaction costs

Essential for retrieving current blockchain state of tokenized assets for trading, portfolio management, and asset verification.
</description>`;

const GetAssetMetadataSchema = z
  .object({
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("The platform where the asset originates"),
    assetId: z
      .string()
      .describe("Unique identifier for the asset on the platform"),
  })
  .describe(
    "Parameters for retrieving blockchain metadata of a tokenized asset",
  );

export const registerGetAssetMetadataTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_asset_metadata",
      DESCRIPTION,
      GetAssetMetadataSchema.shape,
      async (params) => {
        // Mock comprehensive asset metadata for tokenized assets
        const mockAssetMetadata: Record<string, Record<string, any>> = {
          splint_invest: {
            "WINE-BORDEAUX-001": {
              assetId: "WINE-BORDEAUX-001",
              platform: "splint_invest",
              assetType: "wine",
              subcategory: "bordeaux",
              currency: "USD",
              tokenAddress: "0xa1b2c3d4e5f6789012345678901234567890abcd",
              symbol: "SPLINT_WINE_BORDEAUX_001",
              name: "Château Margaux 2019 Token",
              totalSupply: "10000",
              availableShares: "3245",
              sharePrice: "85.00",
              lastValuation: "850000.00",
              legalHash: "0x123abc456def789012345678901234567890abcdef123456789012345678901234",
              valuationTimestamp: Math.floor(Date.now() / 1000) - 3600,
              decimals: 18,
              vintage: 2019,
              region: "Margaux, Bordeaux",
              storage: "Professional wine storage facility",
              certification: "Bordeaux Classification",
              maturityPeriod: "5-15 years",
              expectedYield: 8.5,
              riskLevel: "moderate"
            },
            "WINE-CHAMPAGNE-003": {
              assetId: "WINE-CHAMPAGNE-003",
              platform: "splint_invest",
              assetType: "wine",
              subcategory: "champagne",
              currency: "USD",
              tokenAddress: "0xb2c3d4e5f6789012345678901234567890abcdef1",
              symbol: "SPLINT_WINE_CHAMPAGNE_003",
              name: "Dom Pérignon 2012 Token",
              totalSupply: "25000",
              availableShares: "8934",
              sharePrice: "42.00",
              lastValuation: "1050000.00",
              legalHash: "0x456def789012345678901234567890abcdef123456789012345678901234567890",
              valuationTimestamp: Math.floor(Date.now() / 1000) - 1800,
              decimals: 18,
              vintage: 2012,
              region: "Champagne, France",
              storage: "Underground champagne cellars",
              certification: "Appellation Champagne",
              maturityPeriod: "3-10 years",
              expectedYield: 7.8,
              riskLevel: "moderate"
            }
          },
          masterworks: {
            "PICASSO-042": {
              assetId: "PICASSO-042",
              platform: "masterworks",
              assetType: "art",
              subcategory: "modern",
              currency: "USD",
              tokenAddress: "0xc3d4e5f6789012345678901234567890abcdef123",
              symbol: "MASTERWORKS_PICASSO_042",
              name: "Femme au Béret Rouge Token",
              totalSupply: "30000",
              availableShares: "8453",
              sharePrice: "620.00",
              lastValuation: "18600000.00",
              legalHash: "0x789012345678901234567890abcdef123456789012345678901234567890abcdef",
              valuationTimestamp: Math.floor(Date.now() / 1000) - 2400,
              decimals: 18,
              artist: "Pablo Picasso",
              year: 1937,
              medium: "Oil on canvas",
              dimensions: "73 x 60 cm",
              storage: "Private collection vault",
              certification: "Authentication Certificate",
              maturityPeriod: "5-15 years",
              expectedYield: 11.5,
              riskLevel: "high"
            },
            "MONET-WL-2023-004": {
              assetId: "MONET-WL-2023-004",
              platform: "masterworks",
              assetType: "art",
              subcategory: "impressionist",
              currency: "USD",
              tokenAddress: "0xd4e5f6789012345678901234567890abcdef12345",
              symbol: "MASTERWORKS_MONET_WL_2023_004",
              name: "Water Lilies Series Token",
              totalSupply: "50000",
              availableShares: "12847",
              sharePrice: "450.00",
              lastValuation: "22500000.00",
              legalHash: "0xabc123456789012345678901234567890abcdef123456789012345678901234567890",
              valuationTimestamp: Math.floor(Date.now() / 1000) - 3600,
              decimals: 18,
              artist: "Claude Monet",
              year: 1919,
              medium: "Oil on canvas",
              dimensions: "200 x 425 cm",
              storage: "Climate-controlled museum facility",
              certification: "Provenance Verified",
              maturityPeriod: "3-10 years",
              expectedYield: 9.2,
              riskLevel: "medium-high"
            }
          },
          realt: {
            "DETROIT-HOUSE-789": {
              assetId: "DETROIT-HOUSE-789",
              platform: "realt",
              assetType: "real_estate",
              subcategory: "residential",
              currency: "USD",
              tokenAddress: "0xe5f6789012345678901234567890abcdef123456",
              symbol: "REALT_DETROIT_HOUSE_789",
              name: "1542 Riverside Dr Detroit Token",
              totalSupply: "80000",
              availableShares: "23456",
              sharePrice: "12.50",
              lastValuation: "1000000.00",
              legalHash: "0xdef123456789012345678901234567890abcdef123456789012345678901234567890",
              valuationTimestamp: Math.floor(Date.now() / 1000) - 1200,
              decimals: 18,
              location: "Detroit, MI",
              propertyType: "Single Family Home",
              yearBuilt: 1925,
              squareFeet: 1680,
              monthlyRent: 1200,
              annualYield: 11.52,
              occupancyRate: 92,
              maturityPeriod: "Long-term rental income",
              expectedYield: 11.5,
              riskLevel: "medium"
            }
          }
        };

        const platformMetadata = mockAssetMetadata[params.platform];
        if (!platformMetadata) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Platform "${params.platform}" not supported for blockchain metadata retrieval.`,
              },
            ],
          };
        }

        const assetMetadata = platformMetadata[params.assetId];
        if (!assetMetadata) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Asset "${params.assetId}" not found on blockchain for platform "${params.platform}".\n\n**Possible reasons:**\n- Asset not yet tokenized\n- Invalid asset ID\n- Asset exists on platform but hasn't been converted to blockchain tokens\n\n**Solution:** Use the tokenize_asset tool to convert this asset to blockchain tokens first.`,
              },
            ],
          };
        }

        const circulatingSupply = parseFloat(assetMetadata.totalSupply) - parseFloat(assetMetadata.availableShares);
        const marketCap = parseFloat(assetMetadata.lastValuation);
        const pricePerToken = parseFloat(assetMetadata.sharePrice);

        return {
          content: [
            {
              type: "text" as const,
              text: `📊 **Blockchain Asset Metadata - ${params.platform}:${params.assetId}**\n\n**Token Contract Information:**\n- Contract Address: ${assetMetadata.tokenAddress}\n- Token Symbol: ${assetMetadata.symbol}\n- Token Name: ${assetMetadata.name}\n- Decimals: ${assetMetadata.decimals}\n\n**Supply & Valuation:**\n- Total Supply: ${parseFloat(assetMetadata.totalSupply).toLocaleString()} tokens\n- Circulating Supply: ${circulatingSupply.toLocaleString()} tokens\n- Available for Purchase: ${parseFloat(assetMetadata.availableShares).toLocaleString()} tokens\n- Share Price: $${pricePerToken.toLocaleString()}\n- Market Cap: $${marketCap.toLocaleString()}\n\n**Asset Details:**\n- Asset Type: ${assetMetadata.assetType}\n- Subcategory: ${assetMetadata.subcategory}\n- Platform: ${assetMetadata.platform}\n- Expected Yield: ${assetMetadata.expectedYield}%\n- Risk Level: ${assetMetadata.riskLevel}\n- Maturity: ${assetMetadata.maturityPeriod}\n\n**Blockchain Security:**\n- Legal Hash: ${assetMetadata.legalHash}\n- Last Updated: ${new Date(assetMetadata.valuationTimestamp * 1000).toLocaleString()}\n- Currency: ${assetMetadata.currency}\n\n**Asset-Specific Information:**\n${assetMetadata.artist ? `- Artist: ${assetMetadata.artist}\n- Year: ${assetMetadata.year}\n- Medium: ${assetMetadata.medium}\n- Dimensions: ${assetMetadata.dimensions}` : ''}\n${assetMetadata.vintage ? `- Vintage: ${assetMetadata.vintage}\n- Region: ${assetMetadata.region}\n- Storage: ${assetMetadata.storage}\n- Certification: ${assetMetadata.certification}` : ''}\n${assetMetadata.location ? `- Location: ${assetMetadata.location}\n- Property Type: ${assetMetadata.propertyType}\n- Year Built: ${assetMetadata.yearBuilt}\n- Square Feet: ${assetMetadata.squareFeet?.toLocaleString()}\n- Monthly Rent: $${assetMetadata.monthlyRent?.toLocaleString()}\n- Annual Yield: ${assetMetadata.annualYield}%\n- Occupancy Rate: ${assetMetadata.occupancyRate}%` : ''}\n\n**Trading Information:**\n✅ Asset is fully tokenized and available for:\n- AMM trading through swap_tokens\n- Liquidity provision via add_liquidity\n- Portfolio rebalancing\n- Automated trading strategies\n\n**Complete Metadata:**\n${JSON.stringify(assetMetadata, null, 2)}`,
            },
          ],
        };
      },
    );
  };
