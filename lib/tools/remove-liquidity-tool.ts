import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Withdraws liquidity from an AMM pool by burning LP (liquidity provider) tokens and receiving the underlying token pair. This allows users to exit their liquidity position and claim accumulated trading fees.

<use-cases>
- Exit liquidity position: liquidity = "1000" → burn 1000 LP tokens for underlying assets
- Partial withdrawal: liquidity = "500" → withdraw half of your liquidity position  
- Claim accumulated fees: LP tokens include earned fees from trading activity
- Rebalance portfolio: Remove liquidity to reallocate capital to different assets
- Emergency exit: Quickly convert LP position back to tradeable tokens
</use-cases>

⚠️ IMPORTANT NOTES:

- Burns LP tokens permanently to redeem underlying assets
- Receives proportional amounts of both tokens in the pool
- Includes all accumulated trading fees earned during liquidity provision
- Slippage protection prevents unfavorable withdrawals during volatility
- Cannot withdraw more LP tokens than you own

Essential for exiting liquidity positions, claiming earned fees, and converting LP tokens back to tradeable assets for portfolio rebalancing.
</description>`;

const RemoveLiquiditySchema = z
  .object({
    tokenA: z.string().describe("Contract address of the first token"),
    tokenB: z.string().describe("Contract address of the second token"),
    liquidity: z.string().describe("Amount of LP tokens to burn and redeem"),
    amountAMin: z
      .string()
      .optional()
      .describe("Minimum amount of tokenA to receive (slippage protection)"),
    amountBMin: z
      .string()
      .optional()
      .describe("Minimum amount of tokenB to receive (slippage protection)"),
  })
  .describe("Parameters for removing liquidity from an AMM pool");

export const registerRemoveLiquidityTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "remove_liquidity",
      DESCRIPTION,
      RemoveLiquiditySchema.shape,
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

          // Execute remove liquidity
          const result = await sdk.removeLiquidity({
            tokenA: params.tokenA,
            tokenB: params.tokenB,
            liquidity: params.liquidity,
            amountAMin: params.amountAMin || "0",
            amountBMin: params.amountBMin || "0",
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ Liquidity successfully removed!\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed\n\n**LP Tokens Burned:**\n- LP Amount: ${parseFloat(params.liquidity).toLocaleString()}\n- Pool: ${params.tokenA.slice(0, 8)}.../${params.tokenB.slice(0, 8)}...\n\n**Assets Received:**\n- You received proportional amounts of both tokens\n- Includes all accumulated trading fees\n- Tokens are now available for trading or withdrawal\n\n**Position Status:**\n- ✅ LP tokens successfully burned\n- ✅ Underlying assets claimed\n- ✅ Accumulated fees included in withdrawal\n\n**Next Steps:**\n- Check your token balances for received assets\n- Assets can now be traded, held, or used in other pools\n- Consider reinvesting in different liquidity pools`,
              },
            ],
          };
        } catch (error) {
          console.error("Remove liquidity failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to remove liquidity: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Insufficient LP token balance for the specified amount\n- Pool doesn't exist or has no liquidity\n- Slippage protection triggered (market moved unfavorably)\n- LP tokens not approved for withdrawal\n- Network congestion or gas issues\n\n**Solutions:**\n- Verify your LP token balance in the specified pool\n- Check that pool exists and has active liquidity\n- Try with lower amounts or adjust slippage tolerance\n- Ensure LP tokens are approved for the AMM contract`,
              },
            ],
          };
        }
      },
    );
  };
