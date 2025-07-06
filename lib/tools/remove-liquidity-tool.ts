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
        // Mock wallet address
        const walletAddress = "0x742d35Cc6634C0532925a3b8F33C7D1C93F9e7A2";
        
        // Mock realistic remove liquidity transaction
        const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
        const mockBlockNumber = 12345678 + Math.floor(Math.random() * 1000);
        const liquidityAmount = parseFloat(params.liquidity);
        
        // Calculate tokens received (with accumulated fees)
        const poolShare = liquidityAmount / 100000; // Assume 100k total LP tokens
        const baseTokenA = liquidityAmount * 1.5; // Base amount
        const baseTokenB = liquidityAmount * 0.8; // Base amount
        const feeBonus = 1.0 + (poolShare * 0.05); // Fee accumulation bonus
        
        const tokenAReceived = baseTokenA * feeBonus;
        const tokenBReceived = baseTokenB * feeBonus;
        const accumulatedFees = (tokenAReceived + tokenBReceived) * 0.03; // 3% fees earned
        
        const result = {
          success: true,
          transactionHash: mockTxHash,
          blockNumber: mockBlockNumber,
          gasUsed: 187543,
          gasFee: "0.0089 ETH",
          liquidityRemoved: {
            lpTokensBurned: liquidityAmount.toFixed(6),
            poolShareRedeemed: (poolShare * 100).toFixed(4),
            poolAddress: `0x${Math.random().toString(16).slice(2, 42)}`
          },
          tokensReceived: {
            tokenA: {
              address: params.tokenA,
              amount: tokenAReceived.toFixed(6),
              baseAmount: baseTokenA.toFixed(6),
              feesIncluded: ((tokenAReceived - baseTokenA) / baseTokenA * 100).toFixed(2)
            },
            tokenB: {
              address: params.tokenB,
              amount: tokenBReceived.toFixed(6),
              baseAmount: baseTokenB.toFixed(6),
              feesIncluded: ((tokenBReceived - baseTokenB) / baseTokenB * 100).toFixed(2)
            }
          },
          feesSummary: {
            totalFeesEarned: accumulatedFees.toFixed(6),
            holdingPeriod: "23 days",
            averageDailyReturn: "0.12%",
            totalReturn: (accumulatedFees / (baseTokenA + baseTokenB) * 100).toFixed(2)
          },
          finalBalances: {
            remainingLPTokens: "0",
            liquidityPosition: "Fully withdrawn"
          }
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `✅ **Liquidity Successfully Removed!**\n\n**Transaction Confirmed:**\n- Transaction Hash: ${result.transactionHash}\n- Block Number: ${result.blockNumber.toLocaleString()}\n- Gas Used: ${result.gasUsed.toLocaleString()}\n- Gas Fee: ${result.gasFee}\n\n**LP Position Closed:**\n- **LP Tokens Burned**: ${result.liquidityRemoved.lpTokensBurned}\n- **Pool Share Redeemed**: ${result.liquidityRemoved.poolShareRedeemed}%\n- **Pool Address**: ${result.liquidityRemoved.poolAddress}\n\n**Assets Received:**\n- **Token A**: ${result.tokensReceived.tokenA.amount} (${params.tokenA.slice(0, 8)}...)\n  - Base Amount: ${result.tokensReceived.tokenA.baseAmount}\n  - Fees Earned: +${result.tokensReceived.tokenA.feesIncluded}%\n\n- **Token B**: ${result.tokensReceived.tokenB.amount} (${params.tokenB.slice(0, 8)}...)\n  - Base Amount: ${result.tokensReceived.tokenB.baseAmount}\n  - Fees Earned: +${result.tokensReceived.tokenB.feesIncluded}%\n\n**Earnings Summary:**\n💰 **Total Fees Earned**: ${result.feesSummary.totalFeesEarned} USD equivalent\n📅 **Holding Period**: ${result.feesSummary.holdingPeriod}\n📈 **Average Daily Return**: ${result.feesSummary.averageDailyReturn}\n🎯 **Total Return**: ${result.feesSummary.totalReturn}%\n\n**Position Status:**\n- ✅ LP position completely liquidated\n- ✅ All accumulated trading fees claimed\n- ✅ Tokens available for trading or withdrawal\n- ✅ No remaining exposure to impermanent loss\n\n**What You Received:**\n1. Original liquidity + accumulated trading fees\n2. Proportional share of all fees earned during holding period\n3. Full ownership of underlying token amounts\n\n**Next Steps:**\n- ✨ Tokens are now in your wallet and available for use\n- 🔄 Consider reinvesting in other pools for continued yield\n- 📊 Use get_portfolio to see updated balances\n- 💱 Trade tokens via swap_tokens if desired\n\n**Complete Withdrawal Data:**\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      },
    );
  };
