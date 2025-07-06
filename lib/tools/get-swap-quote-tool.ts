import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `<description>
Calculates the expected output amount for a token swap without executing the trade. This provides a preview of swap results including price impact, slippage, and trading fees for informed decision making.

<use-cases>
- Preview trade results: tokenIn = "WINE-001", tokenOut = "ETH", amountIn = "1000" → see expected ETH output
- Calculate price impact: Compare expected output vs theoretical price for large trades  
- Check trade feasibility: Verify sufficient liquidity exists before attempting swap
- Compare trading routes: Get quotes for different token pairs to find best rates
- Set slippage limits: Use quote to determine appropriate amountOutMin for actual swap
</use-cases>

⚠️ IMPORTANT NOTES:

- Read-only operation with no transaction costs or blockchain changes
- Prices can change between quote and actual execution
- Large trades may have significant price impact due to AMM mechanics
- Quote includes trading fees and reflects current pool liquidity
- Always use recent quotes for time-sensitive trading decisions

Essential for previewing trades, setting appropriate slippage protection, and making informed trading decisions before executing swaps.
</description>`;

const GetSwapQuoteSchema = z
  .object({
    tokenIn: z.string().describe("Contract address of the token being sold"),
    tokenOut: z.string().describe("Contract address of the token being bought"),
    amountIn: z
      .string()
      .describe("Amount of input token to calculate quote for"),
  })
  .describe("Parameters for calculating swap output without executing");

export const registerGetSwapQuoteTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_swap_quote",
      DESCRIPTION,
      GetSwapQuoteSchema.shape,
      async (params) => {
        try {
          // Initialize SDK (read-only operation, no private key needed)
          const sdk = new LuxBridgeSDK({
            network: "zircuit",
          });

          // Get swap quote
          const quote = await sdk.getAmountOut({
            tokenIn: params.tokenIn,
            tokenOut: params.tokenOut,
            amountIn: params.amountIn,
          });

          // Calculate additional metrics
          const inputAmount = parseFloat(params.amountIn);
          const outputAmount = parseFloat(quote.amountOut);
          const effectiveRate = outputAmount / inputAmount;

          // Calculate price impact (simplified)
          const priceImpact =
            inputAmount > 1000
              ? "Medium"
              : inputAmount > 10000
                ? "High"
                : "Low";

          // Suggested slippage protection (5% for normal trades, 10% for large trades)
          const suggestedSlippage = inputAmount > 10000 ? 10 : 5;
          const minAmountOut = (
            (outputAmount * (100 - suggestedSlippage)) /
            100
          ).toFixed(6);

          return {
            content: [
              {
                type: "text" as const,
                text: `📊 **Swap Quote Preview**\n\n**Trade Details:**\n- Input: ${inputAmount.toLocaleString()} tokens (${params.tokenIn.slice(0, 8)}...)\n- Expected Output: ${outputAmount.toLocaleString()} tokens (${params.tokenOut.slice(0, 8)}...)\n- Effective Rate: 1 input = ${effectiveRate.toFixed(6)} output tokens\n\n**Trade Analysis:**\n- Price Impact: ${priceImpact}\n- Liquidity: ${outputAmount > 0 ? "✅ Sufficient" : "❌ Insufficient"}\n- Pool Status: ${outputAmount > 0 ? "Active" : "No liquidity"}\n\n**Recommended Parameters for Swap:**\n- amountIn: "${params.amountIn}"\n- amountOutMin: "${minAmountOut}" (${suggestedSlippage}% slippage protection)\n- tokenIn: "${params.tokenIn}"\n- tokenOut: "${params.tokenOut}"\n\n**Next Steps:**\n- Use these parameters with swap_tokens to execute\n- Monitor for price changes if not trading immediately\n- Consider smaller trades if price impact is high`,
              },
            ],
          };
        } catch (error) {
          console.error("Get swap quote failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Cannot get swap quote: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Possible Issues:**\n- No liquidity pool exists for this token pair\n- Invalid token addresses provided\n- Pool has insufficient liquidity for this trade size\n- One or both tokens not properly tokenized\n- Network connection issue\n\n**Solutions:**\n- Verify both token addresses are correct\n- Check that tokens have been tokenized and pools exist\n- Try with a smaller input amount\n- Ensure both tokens are part of the AMM system`,
              },
            ],
          };
        }
      },
    );
  };
