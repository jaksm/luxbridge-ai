import { LuxBridgeSDK } from "@/blockchain";
import { RegisterTool } from "./types";
import { z } from "zod";

const DESCRIPTION = `Calculate arbitrage opportunities between different RWA platforms. This tool identifies price discrepancies across platforms that can be exploited for risk-free profit through cross-platform trading.

Use cases:
- Check wine arbitrage: assetId = "BORDEAUX-2019", platformA = "splint_invest", platformB = "masterworks"
- Monitor art spreads: assetId = "PICASSO-042", platformA = "masterworks", platformB = "realt"
- Find real estate opportunities: assetId = "CHICAGO-001", platformA = "realt", platformB = "splint_invest"
- Identify profitable trades: Returns spread percentage and profit potential for different trade sizes

The tool analyzes:
- Current price on each platform
- Spread percentage and basis points
- Profit potential after fees
- Recommended action based on spread size

Note: This is a read-only analysis. Use queue_automated_trade to execute arbitrage opportunities.`;

const CalculateArbitrageOpportunitySchema = z
  .object({
    assetId: z
      .string()
      .describe("Asset identifier to calculate arbitrage spread for"),
    platformA: z.string().describe("First platform to compare prices"),
    platformB: z.string().describe("Second platform to compare prices"),
  })
  .describe(
    "Parameters for calculating arbitrage opportunities between platforms",
  );

export const registerCalculateArbitrageOpportunityTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "calculate_arbitrage_opportunity",
      DESCRIPTION,
      CalculateArbitrageOpportunitySchema.shape,
      async (params) => {
        try {
          // Initialize SDK (read-only operation, no private key needed)
          const sdk = new LuxBridgeSDK({
            network: "localhost",
          });

          // Calculate arbitrage spread
          const spreadResult = await sdk.calculateArbitrageSpread({
            assetId: params.assetId,
            platformA: params.platformA,
            platformB: params.platformB,
          });

          const spreadPercentage = spreadResult.spreadPercentage;
          const spreadBasisPoints = spreadResult.spread;

          // Determine opportunity quality
          let opportunityLevel = "None";
          let recommendation = "No arbitrage opportunity";
          let urgency = "🟢 No action needed";

          if (spreadPercentage > 0.5) {
            opportunityLevel = "Excellent";
            recommendation =
              "Strong arbitrage opportunity - consider immediate execution";
            urgency = "🔴 High priority - act quickly";
          } else if (spreadPercentage > 0.2) {
            opportunityLevel = "Good";
            recommendation =
              "Moderate arbitrage opportunity - profitable if execution costs are low";
            urgency = "🟡 Medium priority - monitor closely";
          } else if (spreadPercentage > 0.05) {
            opportunityLevel = "Marginal";
            recommendation =
              "Small arbitrage opportunity - check execution costs carefully";
            urgency = "🟠 Low priority - may not be profitable after fees";
          }

          // Calculate potential profit for different trade sizes
          const calculateProfit = (tradeSize: number) => {
            const grossProfit = tradeSize * (spreadPercentage / 100);
            const estimatedFees = tradeSize * 0.003; // 0.3% estimated fees
            const netProfit = grossProfit - estimatedFees;
            return {
              gross: grossProfit,
              net: netProfit,
              profitable: netProfit > 0,
            };
          };

          const profit1k = calculateProfit(1000);
          const profit10k = calculateProfit(10000);
          const profit50k = calculateProfit(50000);

          return {
            content: [
              {
                type: "text" as const,
                text: `📈 **Arbitrage Analysis: ${params.assetId}**\n\n**Price Spread Analysis:**\n- Platform A (${params.platformA}): Base price\n- Platform B (${params.platformB}): Price difference\n- Spread: ${spreadPercentage.toFixed(4)}% (${spreadBasisPoints} basis points)\n- Opportunity Level: ${opportunityLevel}\n\n**${urgency}**\n**Recommendation:** ${recommendation}\n\n**Profit Potential Analysis:**\n\n**$1,000 Trade:**\n- Gross Profit: $${profit1k.gross.toFixed(2)}\n- Est. Fees: $${(profit1k.gross - profit1k.net).toFixed(2)}\n- Net Profit: $${profit1k.net.toFixed(2)} ${profit1k.profitable ? "✅" : "❌"}\n\n**$10,000 Trade:**\n- Gross Profit: $${profit10k.gross.toFixed(2)}\n- Est. Fees: $${(profit10k.gross - profit10k.net).toFixed(2)}\n- Net Profit: $${profit10k.net.toFixed(2)} ${profit10k.profitable ? "✅" : "❌"}\n\n**$50,000 Trade:**\n- Gross Profit: $${profit50k.gross.toFixed(2)}\n- Est. Fees: $${(profit50k.gross - profit50k.net).toFixed(2)}\n- Net Profit: $${profit50k.net.toFixed(2)} ${profit50k.profitable ? "✅" : "❌"}\n\n**Execution Considerations:**\n- ⏱️ Arbitrage windows close quickly\n- 💰 Consider transaction fees and gas costs\n- 📊 Large trades may move market prices\n- 🤖 Consider using queue_automated_trade for optimal timing\n\n**Next Steps:**\n${opportunityLevel !== "None" ? "- Use queue_automated_trade to capture this opportunity\n- Monitor for better entry points\n- Execute quickly before spread closes" : "- Continue monitoring for better opportunities\n- Check other asset pairs\n- Set up automated monitoring"}`,
              },
            ],
          };
        } catch (error) {
          console.error("Calculate arbitrage opportunity failed:", error);
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Failed to calculate arbitrage opportunity: ${error instanceof Error ? error.message : "Unknown error"}\n\n**Common Issues:**\n- Asset not available on one or both platforms\n- Invalid platform or asset identifiers\n- No price data available for comparison\n- Asset not yet tokenized on blockchain\n- Network connection or oracle issues\n\n**Solutions:**\n- Verify asset exists on both specified platforms\n- Check that asset identifiers are correct\n- Ensure assets are tokenized and have active trading\n- Try with different asset or platform combinations\n- Check network connectivity and try again`,
              },
            ],
          };
        }
      },
    );
  };
