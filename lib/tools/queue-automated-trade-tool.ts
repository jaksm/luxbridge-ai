import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `Queue an automated trade for AI-optimized execution. The AI agent will monitor market conditions and execute when timing is optimal, respecting your delegation limits and slippage protection.

Use cases:
- Queue wine to art swap: sellPlatform = "splint_invest", sellAsset = "BORDEAUX-2019", buyPlatform = "masterworks", buyAsset = "PICASSO-042", amount = "1000"
- Schedule rebalancing: sellAsset = "REAL-001", buyAsset = "WINE-002", amount = "5000", minAmountOut = "4900"
- Set arbitrage trades: Cross-platform trades executed when spreads are favorable
- Time-bound trades: deadlineHours = 48 for trades that must execute within 2 days

Automation features:
- AI monitors for optimal execution timing
- Respects slippage protection (minAmountOut)
- Executes within deadline or expires
- Subject to delegation limits

⚠️ Requires active trading delegation. Use delegate_trading_permissions first.`;

const QueueAutomatedTradeSchema = z
  .object({
    sellPlatform: z.string().describe("Platform identifier for the sell asset"),
    sellAsset: z.string().describe("Asset identifier of the token being sold"),
    buyPlatform: z.string().describe("Platform identifier for the buy asset"),
    buyAsset: z.string().describe("Asset identifier of the token being bought"),
    amount: z.string().describe("Amount of sell token to trade"),
    minAmountOut: z
      .string()
      .optional()
      .describe("Minimum acceptable output amount (slippage protection)"),
    deadlineHours: z
      .number()
      .default(24)
      .describe("Hours from now when trade expires (default 24)"),
  })
  .describe("Parameters for queuing an automated trade for later execution");

export const registerQueueAutomatedTradeTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "queue_automated_trade",
      DESCRIPTION,
      QueueAutomatedTradeSchema.shape,
      async (params) => {
        try {
          // Extract wallet address from access token
          const walletAddress = accessToken.userData?.walletAddress;
          if (!walletAddress) {
            throw new Error("No wallet address found in user session");
          }

          // Initialize SDK with user's wallet
          const sdk = new LuxBridgeSDK({
            network: "zircuit",
            privateKey:
              process.env.DEMO_PRIVATE_KEY ||
              "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          });

          // Calculate deadline timestamp
          const deadlineTimestamp =
            Math.floor(Date.now() / 1000) + params.deadlineHours * 3600;

          // Queue the automated trade
          const result = await sdk.queueAutomatedTrade({
            user: walletAddress,
            sellPlatform: params.sellPlatform,
            sellAsset: params.sellAsset,
            buyPlatform: params.buyPlatform,
            buyAsset: params.buyAsset,
            amount: params.amount,
            minAmountOut: params.minAmountOut || "0",
            deadline: deadlineTimestamp,
          });

          const tradeValue = parseFloat(params.amount);
          const expiryDate = new Date(deadlineTimestamp * 1000);

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ **Automated trade queued successfully!**\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed and queued\n\n**Trade Parameters:**\n- Sell: ${tradeValue.toLocaleString()} ${params.sellAsset} (${params.sellPlatform})\n- Buy: ${params.buyAsset} (${params.buyPlatform})\n- Min Output: ${params.minAmountOut || "Market rate"}\n- Expires: ${expiryDate.toLocaleString()}\n\n**Automation Status:**\n- 🕐 Trade queued for optimal execution\n- 🤖 AI will monitor market conditions\n- ⚡ Will execute when timing is advantageous\n- 🛡️ Respects your delegation limits and slippage protection\n\n**What Happens Next:**\n- AI monitors this trade continuously\n- Executes automatically when conditions are optimal\n- Trade expires on ${expiryDate.toLocaleDateString()} if not executed\n- You'll be notified when the trade executes\n\n**Monitor Progress:**\n- Use execute_automated_trade if you want immediate execution\n- Trade will appear in your automation dashboard\n- Can be cancelled before execution if needed`,
              },
            ],
          };
        } catch (error) {
          console.error("Queue automated trade failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to queue automated trade: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Trading permissions not delegated or insufficient limits\n- Sell asset not in your allowedAssets list\n- Trade amount exceeds your maxTradeSize limit\n- Invalid platform or asset identifiers\n- Deadline too short or too long\n\n**Solutions:**\n- Ensure you have delegated trading permissions with sufficient limits\n- Verify the sell asset is in your allowed assets list\n- Check that trade amount is within your delegation limits\n- Confirm platform and asset identifiers are correct\n- Use delegate_trading_permissions to adjust limits if needed`,
              },
            ],
          };
        }
      },
    );
  };
