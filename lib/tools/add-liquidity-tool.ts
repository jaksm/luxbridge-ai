import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Provides liquidity to an automated market maker (AMM) pool by depositing two tokens in exchange for LP (liquidity provider) tokens. This enables users to earn trading fees from the pool while supporting the trading ecosystem.

<use-cases>
- Provide wine/ETH liquidity: tokenA = "0x123...WINE", tokenB = "0x456...ETH", amounts based on current pool ratio
- Add art/real estate liquidity: Cross-RWA pool liquidity for direct trading between asset classes
- Earn trading fees: Receive LP tokens that accumulate fees from all trades in the pool
- Support market making: Help provide liquidity for other users' trades
- Balanced deposits: Provide equal value of both tokens to maintain pool balance
</use-cases>

⚠️ IMPORTANT NOTES:

- Requires equal USD value of both tokens for optimal deposit
- Slippage protection prevents unfavorable deposits during price volatility
- LP tokens represent proportional ownership of the pool
- Earns fees from all trades but exposed to impermanent loss risk
- Must approve both tokens for the AMM contract before calling

Essential for earning passive income from trading fees while supporting the liquidity infrastructure for cross-platform RWA trading.
</description>`;

const AddLiquiditySchema = z
  .object({
    tokenA: z.string().describe("Contract address of the first token"),
    tokenB: z.string().describe("Contract address of the second token"),
    amountADesired: z
      .string()
      .describe("Desired amount of tokenA to add (in token units)"),
    amountBDesired: z
      .string()
      .describe("Desired amount of tokenB to add (in token units)"),
    amountAMin: z
      .string()
      .optional()
      .describe("Minimum amount of tokenA to add (slippage protection)"),
    amountBMin: z
      .string()
      .optional()
      .describe("Minimum amount of tokenB to add (slippage protection)"),
  })
  .describe("Parameters for adding liquidity to an AMM pool");

export const registerAddLiquidityTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "add_liquidity",
      DESCRIPTION,
      AddLiquiditySchema.shape,
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

          // Execute add liquidity
          const result = await sdk.addLiquidity({
            tokenA: params.tokenA,
            tokenB: params.tokenB,
            amountADesired: params.amountADesired,
            amountBDesired: params.amountBDesired,
            amountAMin: params.amountAMin || "0",
            amountBMin: params.amountBMin || "0",
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ Liquidity successfully added!\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed\n\n**Liquidity Provided:**\n- Token A: ${parseFloat(params.amountADesired).toLocaleString()} tokens\n- Token B: ${parseFloat(params.amountBDesired).toLocaleString()} tokens\n- Pool: ${params.tokenA.slice(0, 8)}.../${params.tokenB.slice(0, 8)}...\n\n**LP Token Benefits:**\n- ✅ Earning trading fees from all pool swaps\n- ✅ LP tokens represent your pool ownership\n- ✅ Can withdraw liquidity anytime using remove_liquidity\n\n**Next Steps:**\n- Monitor your LP position value\n- Earn fees as users trade through this pool\n- Use remove_liquidity when you want to withdraw`,
              },
            ],
          };
        } catch (error) {
          console.error("Add liquidity failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to add liquidity: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Insufficient token balance for the specified amounts\n- Pool doesn't exist (check token addresses)\n- Tokens not approved for AMM contract\n- Slippage protection triggered (try adjusting min amounts)\n- Network congestion or gas issues\n\n**Solutions:**\n- Verify you have sufficient balance of both tokens\n- Check that token addresses are correct\n- Ensure tokens are approved for spending\n- Try with lower amounts or adjust slippage tolerance`,
              },
            ],
          };
        }
      },
    );
  };
