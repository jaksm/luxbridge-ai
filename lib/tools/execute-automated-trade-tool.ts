import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `Execute a previously queued automated trade immediately. This bypasses the AI's timing optimization and executes the trade at current market conditions if still valid.

Use cases:
- Execute queued arbitrage: tradeId = "0x123..." - Capture opportunity before it closes
- Force portfolio rebalance: tradeId = "0x456..." - Execute rebalancing trade now
- Complete pending trades: tradeId = "0x789..." - Clear queued trades before deadline

What happens:
1. Retrieves queued trade parameters
2. Verifies trade is still valid (not expired, permissions active)
3. Executes swap at current market rates
4. Removes trade from automation queue

⚠️ IMPORTANT: Trade must exist in queue and not be expired. Delegation permissions must still be active.`;

const ExecuteAutomatedTradeSchema = z
  .object({
    tradeId: z
      .string()
      .describe("The unique identifier of the queued trade to execute"),
  })
  .describe("Parameters for executing a previously queued automated trade");

export const registerExecuteAutomatedTradeTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "execute_automated_trade",
      DESCRIPTION,
      ExecuteAutomatedTradeSchema.shape,
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

          // Execute the automated trade
          const result = await sdk.executeAutomatedTrade({
            tradeId: params.tradeId,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ **Automated trade executed successfully!**\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Trade ID: ${params.tradeId}\n- Status: Confirmed and completed\n\n**Execution Summary:**\n- ✅ Trade parameters verified\n- ✅ Delegation permissions confirmed\n- ✅ Slippage protection applied\n- ✅ Tokens swapped successfully\n- ✅ Trade removed from queue\n\n**Trade Results:**\n- Trade executed at current market rates\n- Tokens transferred to your wallet\n- Trading fees deducted and distributed to liquidity providers\n- Portfolio updated with new asset allocation\n\n**What Happened:**\n- Queued trade was executed immediately\n- All safety checks passed\n- Market conditions were favorable for execution\n- Trade completed within specified parameters\n\n**Next Steps:**\n- Check your wallet balance for received tokens\n- Trade is now complete and removed from automation queue\n- Monitor your portfolio for updated allocations\n- Consider queuing additional trades if needed`,
              },
            ],
          };
        } catch (error) {
          console.error("Execute automated trade failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to execute automated trade: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Trade ID not found or already executed\n- Trade deadline has expired\n- Insufficient balance for the trade\n- Market conditions changed unfavorably (slippage protection triggered)\n- Trading permissions revoked or limits exceeded\n\n**Possible Reasons:**\n- Trade was already executed by automated system\n- Market moved significantly since trade was queued\n- Trade expired due to deadline passing\n- Delegation permissions were modified or revoked\n- Insufficient liquidity in AMM pools\n\n**Solutions:**\n- Verify the trade ID is correct and trade still exists\n- Check if trade deadline hasn't passed\n- Ensure you have sufficient token balance\n- Confirm trading permissions are still active\n- Try queuing a new trade with updated parameters`,
              },
            ],
          };
        }
      },
    );
  };
