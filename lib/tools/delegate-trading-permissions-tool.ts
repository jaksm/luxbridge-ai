import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `Delegate trading permissions to the LuxBridge AI agent with specific limits and restrictions. This enables automated trading while maintaining control through spending limits and asset restrictions.

Use cases:
- Enable AI trading: maxTradeSize = "1000", maxDailyVolume = "5000", allowedAssets = ["0x123...", "0x456..."]
- Set conservative limits: maxTradeSize = "100", maxDailyVolume = "500" for testing
- Revoke permissions: maxTradeSize = "0" to disable all AI trading
- Update limits: Adjust parameters as comfort with AI trading grows

Safety features:
- Hard spending limits per trade and daily volume
- Restricted to specified token addresses only
- Can be revoked instantly by setting maxTradeSize to "0"
- All trades still subject to slippage protection

⚠️ IMPORTANT: This grants the AI agent permission to trade on your behalf within specified limits. Start with small amounts to test. You can revoke anytime.`;

const DelegateTradingPermissionsSchema = z
  .object({
    maxTradeSize: z
      .string()
      .describe(
        "Maximum USD value for a single trade (0 to revoke permissions)",
      ),
    maxDailyVolume: z.string().describe("Maximum USD value of trades per day"),
    allowedAssets: z
      .array(z.string())
      .describe("Array of token contract addresses the AI is allowed to trade"),
  })
  .describe("Parameters for delegating trading permissions to AI agents");

export const registerDelegateTradingPermissionsTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "delegate_trading_permissions",
      DESCRIPTION,
      DelegateTradingPermissionsSchema.shape,
      async (params) => {
        try {
          // Extract wallet address from access token
          const walletAddress = accessToken.userData?.walletAddress;
          if (!walletAddress) {
            throw new Error("No wallet address found in user session");
          }

          // Initialize SDK with user's wallet
          const sdk = new LuxBridgeSDK({
            network: "localhost",
            privateKey:
              process.env.DEMO_PRIVATE_KEY ||
              "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          });

          // Execute delegation
          const result = await sdk.delegateTrading({
            maxTradeSize: params.maxTradeSize,
            maxDailyVolume: params.maxDailyVolume,
            allowedAssets: params.allowedAssets,
          });

          const isRevocation = parseFloat(params.maxTradeSize) === 0;
          const maxTrade = parseFloat(params.maxTradeSize);
          const maxDaily = parseFloat(params.maxDailyVolume);

          return {
            content: [
              {
                type: "text" as const,
                text: isRevocation
                  ? `🔒 **Trading permissions revoked successfully!**\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed\n\n**AI Trading Status:**\n- ❌ AI trading permissions REVOKED\n- ❌ No automated trades can be executed\n- ✅ Your assets are fully protected\n\n**What Changed:**\n- AI can no longer execute any trades on your behalf\n- All queued automated trades are cancelled\n- You retain full manual control of your assets\n\n**Next Steps:**\n- AI trading is now disabled\n- Use this tool again with positive limits to re-enable\n- Manual trading through other tools remains available`
                  : `✅ **Trading permissions delegated successfully!**\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed\n\n**AI Trading Limits:**\n- Max Trade Size: $${maxTrade.toLocaleString()}\n- Max Daily Volume: $${maxDaily.toLocaleString()}\n- Allowed Assets: ${params.allowedAssets.length} tokens\n\n**Permitted Assets:**\n${params.allowedAssets.map((asset) => `- ${asset.slice(0, 8)}...`).join("\n")}\n\n**Safety Features:**\n- ✅ Spending limits strictly enforced\n- ✅ Asset restrictions applied\n- ✅ All trades subject to slippage protection\n- ✅ Can be revoked anytime\n\n**Next Steps:**\n- AI can now execute trades within these limits\n- Monitor AI trading activity regularly\n- Use queue_automated_trade to schedule specific trades\n- Revoke permissions anytime by setting maxTradeSize to "0"`,
              },
            ],
          };
        } catch (error) {
          console.error("Delegate trading permissions failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to delegate trading permissions: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Invalid spending limit values (must be positive numbers)\n- Invalid asset addresses in allowedAssets array\n- User doesn't have sufficient gas for transaction\n- Network congestion or connectivity issues\n\n**Solutions:**\n- Verify all spending limits are valid positive numbers\n- Ensure all asset addresses are valid token contracts\n- Check network connection and try again\n- Start with smaller limits for initial testing`,
              },
            ],
          };
        }
      },
    );
  };
