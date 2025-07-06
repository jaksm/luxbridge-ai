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
        // Mock wallet address
        const walletAddress = "0x742d35Cc6634C0532925a3b8F33C7D1C93F9e7A2";
        
        // Mock realistic add liquidity transaction
        const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
        const mockBlockNumber = 12345678 + Math.floor(Math.random() * 1000);
        const amountADesired = parseFloat(params.amountADesired);
        const amountBDesired = parseFloat(params.amountBDesired);
        
        // Calculate actual amounts added (slightly less due to slippage)
        const amountAActual = amountADesired * (0.995 + Math.random() * 0.009); // 99.5-100.4%
        const amountBActual = amountBDesired * (0.995 + Math.random() * 0.009);
        
        // Calculate LP tokens received (based on geometric mean)
        const lpTokensReceived = Math.sqrt(amountAActual * amountBActual);
        
        const result = {
          success: true,
          transactionHash: mockTxHash,
          blockNumber: mockBlockNumber,
          gasUsed: 245678,
          gasFee: "0.0123 ETH",
          liquidityAdded: {
            tokenA: {
              address: params.tokenA,
              amountDesired: params.amountADesired,
              amountActual: amountAActual.toFixed(6),
              difference: (amountAActual - amountADesired).toFixed(6)
            },
            tokenB: {
              address: params.tokenB,
              amountDesired: params.amountBDesired,
              amountActual: amountBActual.toFixed(6),
              difference: (amountBActual - amountBDesired).toFixed(6)
            },
            lpTokens: {
              amount: lpTokensReceived.toFixed(6),
              poolShare: ((lpTokensReceived / (lpTokensReceived + 50000)) * 100).toFixed(4),
              address: `0x${Math.random().toString(16).slice(2, 42)}`
            }
          },
          poolInfo: {
            totalLiquidity: (50000 + lpTokensReceived).toFixed(2),
            yourShare: ((lpTokensReceived / (50000 + lpTokensReceived)) * 100).toFixed(4),
            estimatedFeeAPY: "12.5%",
            poolFeeRate: "0.3%"
          },
          rewards: {
            tradingFeeEarnings: "Starts immediately",
            liquidityIncentives: "2.5% APY bonus for first 30 days",
            compoundingEnabled: true
          }
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `✅ **Liquidity Successfully Added!**\n\n**Transaction Confirmed:**\n- Transaction Hash: ${result.transactionHash}\n- Block Number: ${result.blockNumber.toLocaleString()}\n- Gas Used: ${result.gasUsed.toLocaleString()}\n- Gas Fee: ${result.gasFee}\n\n**Liquidity Deposited:**\n- **Token A**: ${result.liquidityAdded.tokenA.amountActual} tokens (${result.liquidityAdded.tokenA.address.slice(0, 8)}...)\n- **Token B**: ${result.liquidityAdded.tokenB.amountActual} tokens (${result.liquidityAdded.tokenB.address.slice(0, 8)}...)\n- **Slippage**: ${Math.abs(parseFloat(result.liquidityAdded.tokenA.difference)).toFixed(3)} / ${Math.abs(parseFloat(result.liquidityAdded.tokenB.difference)).toFixed(3)} tokens\n\n**LP Tokens Received:**\n- **Amount**: ${result.liquidityAdded.lpTokens.amount} LP tokens\n- **Pool Share**: ${result.liquidityAdded.lpTokens.poolShare}%\n- **LP Token Address**: ${result.liquidityAdded.lpTokens.address}\n\n**Pool Information:**\n- **Total Pool Liquidity**: ${result.poolInfo.totalLiquidity} LP tokens\n- **Your Ownership**: ${result.poolInfo.yourShare}%\n- **Trading Fee Rate**: ${result.poolInfo.poolFeeRate}\n- **Estimated APY**: ${result.poolInfo.estimatedFeeAPY}\n\n**Earning Opportunities:**\n- 💰 **Trading Fees**: ${result.rewards.tradingFeeEarnings}\n- 🎁 **Bonus Rewards**: ${result.rewards.liquidityIncentives}\n- 🔄 **Compounding**: ${result.rewards.compoundingEnabled ? 'Enabled - fees auto-reinvest' : 'Manual claiming required'}\n\n**Your LP Position:**\n- ✅ Earning fees from every trade in this pool\n- ✅ Pro-rata share of all trading volume\n- ✅ Withdraw anytime using remove_liquidity\n- ⚠️ Subject to impermanent loss if token prices diverge\n\n**Next Steps:**\n1. Monitor your LP position performance\n2. Track earned fees in your portfolio\n3. Consider adding more liquidity for higher rewards\n4. Use remove_liquidity when ready to withdraw\n\n**Complete Transaction Data:**\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );
  };
