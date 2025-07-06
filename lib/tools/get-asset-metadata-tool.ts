import { LuxBridgeSDK } from "@/blockchain";
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
        try {
          // Initialize SDK (read-only operation, no private key needed)
          const sdk = new LuxBridgeSDK({
            network: "zircuit",
          });

          // Get asset metadata from blockchain
          const metadata = await sdk.getAssetMetadata({
            platform: params.platform,
            assetId: params.assetId,
          });

          // Format response
          return {
            content: [
              {
                type: "text" as const,
                text: `📊 **Asset Metadata - ${params.platform}:${params.assetId}**\n\n**Basic Information:**\n- Asset Type: ${metadata.assetType}\n- Subcategory: ${metadata.subcategory}\n- Currency: ${metadata.currency}\n\n**Valuation & Supply:**\n- Current Valuation: $${parseFloat(metadata.lastValuation).toLocaleString()}\n- Share Price: $${parseFloat(metadata.sharePrice).toLocaleString()}\n- Total Supply: ${parseFloat(metadata.totalSupply).toLocaleString()} tokens\n- Available Shares: ${parseFloat(metadata.availableShares).toLocaleString()}\n\n**Blockchain Details:**\n- Platform: ${metadata.platform}\n- Legal Hash: ${metadata.legalHash}\n- Last Updated: ${new Date(metadata.valuationTimestamp * 1000).toLocaleString()}\n\n**Market Metrics:**\n- Market Cap: $${parseFloat(metadata.lastValuation).toLocaleString()}\n- Price per Token: $${parseFloat(metadata.sharePrice).toLocaleString()}\n- Circulating Supply: ${(parseFloat(metadata.totalSupply) - parseFloat(metadata.availableShares)).toLocaleString()} tokens\n\nThis asset is tokenized and available for trading through the AMM system.`,
              },
            ],
          };
        } catch (error) {
          console.error("Failed to get asset metadata:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to retrieve asset metadata: ${error instanceof Error ? error.message : "Unknown error"}\n\nPossible issues:\n- Asset not yet tokenized on blockchain\n- Invalid platform or asset ID\n- Blockchain network connection issue\n- Asset may exist on platform but not tokenized yet\n\nTry using the tokenize_asset tool first if the asset hasn't been tokenized.`,
              },
            ],
          };
        }
      },
    );
  };
