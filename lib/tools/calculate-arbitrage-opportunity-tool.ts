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
        // Mock arbitrage calculation for cross-platform opportunities
        const { assetId, platformA, platformB } = params;
        
        // Mock price data for different assets across platforms
        const mockPrices: Record<string, Record<string, number>> = {
          "WINE-BORDEAUX-001": {
            splint_invest: 85.00,
            masterworks: 87.20, // 2.59% premium
            realt: 84.15 // 1% discount
          },
          "PICASSO-042": {
            splint_invest: 622.50,
            masterworks: 620.00,
            realt: 618.75 // 0.6% discount
          },
          "DETROIT-HOUSE-789": {
            splint_invest: 12.75,
            masterworks: 13.10,
            realt: 12.50
          }
        };
        
        const assetPrices = mockPrices[assetId];
        if (!assetPrices) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Asset "${assetId}" not found in arbitrage database.\\n\\nAvailable assets:\\n${Object.keys(mockPrices).join('\\n- ')}`
              }
            ]
          };
        }
        
        const priceA = assetPrices[platformA];
        const priceB = assetPrices[platformB];
        
        if (!priceA || !priceB) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Price data not available for ${assetId} on specified platforms.\\n\\nAvailable platforms for this asset:\\n${Object.keys(assetPrices).join('\\n- ')}`
              }
            ]
          };
        }
        
        // Calculate arbitrage metrics
        const priceDiff = Math.abs(priceA - priceB);
        const spreadPercentage = (priceDiff / Math.min(priceA, priceB)) * 100;
        const spreadBasisPoints = Math.round(spreadPercentage * 100);
        const cheaperPlatform = priceA < priceB ? platformA : platformB;
        const expensivePlatform = priceA < priceB ? platformB : platformA;
        const cheaperPrice = Math.min(priceA, priceB);
        const expensivePrice = Math.max(priceA, priceB);
        
        // Determine opportunity quality
        let opportunityLevel = "None";
        let recommendation = "No arbitrage opportunity";
        let urgency = "🟢 No action needed";
        let profitability = "Not profitable";
        
        if (spreadPercentage > 0.5) {
          opportunityLevel = "Excellent";
          recommendation = "Strong arbitrage opportunity - consider immediate execution";
          urgency = "🔴 High priority - act quickly";
          profitability = "Highly profitable";
        } else if (spreadPercentage > 0.2) {
          opportunityLevel = "Good";
          recommendation = "Moderate arbitrage opportunity - profitable if execution costs are low";
          urgency = "🟡 Medium priority - monitor closely";
          profitability = "Potentially profitable";
        } else if (spreadPercentage > 0.05) {
          opportunityLevel = "Marginal";
          recommendation = "Small arbitrage opportunity - check execution costs carefully";
          urgency = "🟠 Low priority - may not be profitable after fees";
          profitability = "Marginal profitability";
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

        const arbitrageResult = {
          assetId,
          platforms: { platformA, platformB },
          prices: { platformA: priceA, platformB: priceB },
          spread: {
            absolute: priceDiff,
            percentage: spreadPercentage,
            basisPoints: spreadBasisPoints
          },
          opportunity: {
            level: opportunityLevel,
            profitability,
            recommendation,
            urgency
          },
          execution: {
            buyPlatform: cheaperPlatform,
            sellPlatform: expensivePlatform,
            buyPrice: cheaperPrice,
            sellPrice: expensivePrice
          },
          profitAnalysis: {
            small: profit1k,
            medium: profit10k,
            large: profit50k
          },
          timestamp: new Date().toISOString()
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `📈 **Arbitrage Analysis: ${assetId}**\n\n**Price Comparison:**\n- **${platformA}**: $${priceA.toFixed(2)}\n- **${platformB}**: $${priceB.toFixed(2)}\n- **Price Difference**: $${priceDiff.toFixed(2)}\n- **Spread**: ${spreadPercentage.toFixed(3)}% (${spreadBasisPoints} basis points)\n\n**Opportunity Assessment:**\n${urgency}\n- **Level**: ${opportunityLevel}\n- **Profitability**: ${profitability}\n- **Recommendation**: ${recommendation}\n\n**Execution Strategy:**\n🛒 **Buy on**: ${cheaperPlatform} at $${cheaperPrice.toFixed(2)}\n💰 **Sell on**: ${expensivePlatform} at $${expensivePrice.toFixed(2)}\n\n**Profit Analysis:**\n\n💵 **$1,000 Trade:**\n- Gross Profit: $${profit1k.gross.toFixed(2)}\n- Estimated Fees: $${(profit1k.gross - profit1k.net).toFixed(2)}\n- **Net Profit: $${profit1k.net.toFixed(2)}** ${profit1k.profitable ? '✅ Profitable' : '❌ Not profitable'}\n\n💵 **$10,000 Trade:**\n- Gross Profit: $${profit10k.gross.toFixed(2)}\n- Estimated Fees: $${(profit10k.gross - profit10k.net).toFixed(2)}\n- **Net Profit: $${profit10k.net.toFixed(2)}** ${profit10k.profitable ? '✅ Profitable' : '❌ Not profitable'}\n\n💵 **$50,000 Trade:**\n- Gross Profit: $${profit50k.gross.toFixed(2)}\n- Estimated Fees: $${(profit50k.gross - profit50k.net).toFixed(2)}\n- **Net Profit: $${profit50k.net.toFixed(2)}** ${profit50k.profitable ? '✅ Profitable' : '❌ Not profitable'}\n\n**Risk Considerations:**\n⚠️ **Execution Risk**: Prices may change during transaction\n⏰ **Time Sensitivity**: Arbitrage opportunities close quickly\n💸 **Cost Factors**: Gas fees, trading fees, slippage\n📊 **Market Impact**: Large trades may affect prices\n\n**Recommended Actions:**\n${opportunityLevel !== "None" ? 
            "✅ **Execute Arbitrage:**\n1. Use queue_automated_trade for optimal timing\n2. Buy on " + cheaperPlatform + " first\n3. Immediately sell on " + expensivePlatform + "\n4. Monitor execution for price changes\n\n🤖 **Automation Tip**: Queue trades to capture fleeting opportunities" : 
            "📊 **Continue Monitoring:**\n1. Check other asset pairs for better spreads\n2. Set up price alerts for this asset\n3. Look for opportunities on different platforms\n4. Consider market timing factors"}\n\n**Complete Arbitrage Data:**\n${JSON.stringify(arbitrageResult, null, 2)}`,
            },
          ],
        };
      },
    );
  };
