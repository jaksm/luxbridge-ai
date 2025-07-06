import { LuxBridgeSDK } from "@/blockchain";
import { AssetDataBridge } from "@/lib/utils/assetDataBridge";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Converts a real-world asset from any platform (Splint Invest, Masterworks, RealT) into tradeable ERC-20 tokens on the blockchain. This creates fractional ownership tokens that can be traded, used as liquidity, or held as investment positions.

<use-cases>
- Tokenize wine investment: platform = "splint_invest", assetId = "BORDEAUX-2019", assetType = "wine"
- Tokenize art piece: platform = "masterworks", assetId = "PICASSO-042", assetType = "art"  
- Tokenize real estate: platform = "realt", assetId = "CHICAGO-001", assetType = "real_estate"
- Create tradeable tokens: Convert illiquid RWA into liquid blockchain tokens for trading
- Enable cross-platform trading: Once tokenized, assets can be traded against each other via AMM
</use-cases>

⚠️ IMPORTANT NOTES:

- Creates new ERC-20 token contract for the asset
- Asset must exist and be validated on the origin platform
- Legal documentation hash required for compliance
- Once tokenized, asset can be traded and used in DeFi protocols
- Returns token contract address for future interactions

Essential for bringing real-world assets onto the blockchain and enabling decentralized trading of physical investments.
</description>`;

const TokenizeAssetSchema = z
  .object({
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("The platform where the asset originates"),
    assetId: z
      .string()
      .describe("Unique identifier for the asset on the platform"),
    apiAssetData: z.any().describe("Complete asset data from the platform API"),
  })
  .describe(
    "Parameters for tokenizing a real-world asset into blockchain tokens",
  );

export const registerTokenizeAssetTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "tokenize_asset",
      DESCRIPTION,
      TokenizeAssetSchema.shape,
      async (params) => {
        try {
          // Extract wallet address from access token
          const walletAddress = accessToken.userData?.walletAddress;
          if (!walletAddress) {
            throw new Error("No wallet address found in user session");
          }

          // Initialize SDK with user's wallet (for demo, using localhost)
          const sdk = new LuxBridgeSDK({
            network: "zircuit",
            privateKey:
              process.env.DEMO_PRIVATE_KEY ||
              "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Default hardhat account
          });

          // Transform API asset data to blockchain format
          const { contractData, offChainData, validationErrors } =
            AssetDataBridge.prepareForTokenization(params.apiAssetData);

          if (validationErrors.length > 0) {
            throw new Error(
              `Asset validation failed: ${validationErrors.join(", ")}`,
            );
          }

          // Set platform in contract data
          contractData.platform = params.platform;

          // Execute tokenization on blockchain
          const result = await sdk.tokenizeAsset({
            platform: contractData.platform,
            assetId: contractData.assetId,
            totalSupply: contractData.totalSupply,
            assetType: contractData.assetType,
            subcategory: contractData.subcategory,
            legalHash: contractData.legalHash,
            valuation: contractData.valuation,
            sharePrice: contractData.sharePrice,
            currency: contractData.currency,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ Asset successfully tokenized!\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Token Contract: ${result.tokenAddress}\n- Platform: ${params.platform}\n- Asset ID: ${params.assetId}\n\n**Token Info:**\n- Total Supply: ${contractData.totalSupply} tokens\n- Share Price: $${contractData.sharePrice}\n- Asset Type: ${contractData.assetType}\n- Currency: ${contractData.currency}\n\n**Off-chain Data Stored:**\n- Expert Analysis: Available\n- Physical Attributes: Documented\n- Metadata Version: ${offChainData.metadata.version}\n\nThe asset is now tradeable as an ERC-20 token and can be used in AMM pools for cross-platform trading.`,
              },
            ],
          };
        } catch (error) {
          console.error("Tokenization failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Tokenization failed: ${error instanceof Error ? error.message : "Unknown error"}\n\nPlease ensure:\n- Asset exists on the specified platform\n- All required asset data is provided\n- User has sufficient permissions\n- Blockchain network is accessible`,
              },
            ],
          };
        }
      },
    );
  };
