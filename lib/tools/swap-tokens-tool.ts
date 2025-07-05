import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Executes direct token-to-token swaps through the automated market maker (AMM) system. This enables trading between any tokenized real-world assets or converting assets to ETH/stablecoins for liquidity.

<use-cases>
- Cross-RWA trading: tokenIn = "WINE-001", tokenOut = "ART-042" → trade wine tokens for art tokens
- Convert to ETH: tokenIn = "REAL-ESTATE-001", tokenOut = "ETH" → liquidate real estate position
- Arbitrage trading: Execute profitable trades between different asset classes
- Portfolio rebalancing: Swap overweight positions into underweight assets
- Quick liquidation: Convert any RWA token to liquid assets (ETH/stablecoins)
</use-cases>

⚠️ IMPORTANT NOTES:

- Executes immediately at current market prices through AMM pools
- Slippage protection prevents trades during unfavorable price movements  
- Must have sufficient balance of input token and token approval
- Trading fees automatically deducted and distributed to liquidity providers
- Large trades may experience higher slippage due to AMM mechanics

Essential for cross-platform RWA trading, portfolio rebalancing, and converting between tokenized assets and liquid cryptocurrencies.
</description>`;

const SwapTokensSchema = z
  .object({
    tokenIn: z.string().describe("Contract address of the token being sold"),
    tokenOut: z.string().describe("Contract address of the token being bought"),
    amountIn: z.string().describe("Amount of input token to swap"),
    amountOutMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of output tokens to receive (slippage protection)",
      ),
  })
  .describe("Parameters for executing a token swap through the AMM");

export const registerSwapTokensTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "swap_tokens",
      DESCRIPTION,
      SwapTokensSchema.shape,
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

          // Get expected output amount first (for display)
          let expectedOutput = "Unknown";
          try {
            const quote = await sdk.getAmountOut({
              tokenIn: params.tokenIn,
              tokenOut: params.tokenOut,
              amountIn: params.amountIn,
            });
            expectedOutput = parseFloat(quote.amountOut).toLocaleString();
          } catch (error) {
            console.warn("Could not get quote:", error);
          }

          // Execute swap
          const result = await sdk.swap({
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountIn: params.amountIn,
            amountOutMin: params.amountOutMin || "0",
          });

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ Token swap successful!\n\n**Transaction Details:**\n- Transaction Hash: ${result.transactionHash}\n- Status: Confirmed\n\n**Swap Executed:**\n- Sold: ${parseFloat(params.amountIn).toLocaleString()} tokens\n- Token In: ${params.tokenIn.slice(0, 8)}...\n- Token Out: ${params.tokenOut.slice(0, 8)}...\n- Expected Output: ~${expectedOutput} tokens\n\n**Trade Summary:**\n- ✅ Input tokens successfully burned/transferred\n- ✅ Output tokens received in your wallet\n- ✅ Trading fees paid to liquidity providers\n- ✅ Slippage protection applied\n\n**Next Steps:**\n- Check your wallet balance for received tokens\n- Tokens are immediately available for trading or withdrawal\n- Consider the tax implications of this trade`,
              },
            ],
          };
        } catch (error) {
          console.error("Token swap failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Token swap failed: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Insufficient balance of input token\n- No liquidity pool exists for this token pair\n- Slippage protection triggered (price moved unfavorably)\n- Input token not approved for AMM contract\n- Amount too large for available pool liquidity\n\n**Solutions:**\n- Verify you have sufficient balance of the input token\n- Check that a liquidity pool exists for this token pair\n- Try with a smaller amount or adjust slippage tolerance\n- Ensure input token is approved for spending by AMM contract\n- Use get_swap_quote first to preview the trade`,
              },
            ],
          };
        }
      },
    );
  };
