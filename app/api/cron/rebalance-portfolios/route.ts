import { LuxBridgeSDK } from "@/blockchain";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Initialize SDK with admin credentials
    const sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey:
        process.env.ADMIN_PRIVATE_KEY ||
        process.env.DEMO_PRIVATE_KEY ||
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    });

    const rebalancingResults: any[] = [];
    let usersProcessed = 0;
    let portfoliosRebalanced = 0;

    // Get users who have enabled auto-rebalancing
    const usersWithAutoRebalancing = await getUsersWithAutoRebalancing();

    for (const user of usersWithAutoRebalancing) {
      try {
        usersProcessed++;

        // Get current portfolio state
        const currentPortfolio = await getUserPortfolioState(user.userId);

        // Check if rebalancing is needed based on user's target allocation
        const rebalancingNeeded = await evaluateRebalancingNeed(
          currentPortfolio,
          user.targetAllocation,
          user.rebalancingThreshold,
        );

        if (rebalancingNeeded.needed) {
          // Execute portfolio rebalancing
          const rebalancingResult = await executePortfolioRebalancing(
            sdk,
            user,
            currentPortfolio,
            rebalancingNeeded.trades,
          );

          rebalancingResults.push({
            userId: user.userId,
            status: "rebalanced",
            tradesExecuted: rebalancingResult.tradesExecuted,
            totalCost: rebalancingResult.totalCost,
            allocationImprovement: rebalancingResult.allocationImprovement,
            timestamp: new Date().toISOString(),
          });

          portfoliosRebalanced++;
        } else {
          rebalancingResults.push({
            userId: user.userId,
            status: "no_rebalancing_needed",
            currentAllocation: currentPortfolio.allocation,
            targetAllocation: user.targetAllocation,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(
          `Failed to rebalance portfolio for user ${user.userId}:`,
          error,
        );

        rebalancingResults.push({
          userId: user.userId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersProcessed,
      portfoliosRebalanced,
      rebalancingResults: rebalancingResults.slice(0, 20), // Return first 20 results
    });
  } catch (error) {
    console.error("Portfolio rebalancing failed:", error);
    return Response.json(
      {
        error: "Portfolio rebalancing failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Mock functions for demonstration
async function getUsersWithAutoRebalancing() {
  // In production, this would query the database for users with auto-rebalancing enabled
  return [
    {
      userId: "user_123",
      walletAddress: "0x123abc...",
      targetAllocation: {
        "WINE-001": 40,
        "ART-042": 35,
        "REAL-001": 25,
      },
      rebalancingThreshold: 10, // Rebalance if any asset is >10% off target
      maxTradeSize: 10000,
      autoRebalancingEnabled: true,
    },
    {
      userId: "user_456",
      walletAddress: "0x456def...",
      targetAllocation: {
        "WINE-001": 30,
        "ART-042": 30,
        "REAL-001": 40,
      },
      rebalancingThreshold: 15,
      maxTradeSize: 5000,
      autoRebalancingEnabled: true,
    },
  ];
}

async function getUserPortfolioState(userId: string) {
  // Mock portfolio state - in production this would query actual holdings
  return {
    totalValue: 50000,
    holdings: [
      { asset: "WINE-001", value: 25000, percentage: 50 }, // 10% over target
      { asset: "ART-042", value: 15000, percentage: 30 }, // 5% under target
      { asset: "REAL-001", value: 10000, percentage: 20 }, // 5% under target
    ],
    allocation: {
      "WINE-001": 50,
      "ART-042": 30,
      "REAL-001": 20,
    },
    lastRebalanced: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days ago
  };
}

async function evaluateRebalancingNeed(
  currentPortfolio: any,
  targetAllocation: any,
  threshold: number,
) {
  const trades: any[] = [];
  let maxDeviation = 0;

  for (const [asset, targetPercentage] of Object.entries(targetAllocation)) {
    const currentPercentage = currentPortfolio.allocation[asset] || 0;
    const deviation = Math.abs(
      currentPercentage - (targetPercentage as number),
    );

    if (deviation > maxDeviation) {
      maxDeviation = deviation;
    }

    if (deviation > threshold) {
      const tradeValue = (currentPortfolio.totalValue * deviation) / 100;

      trades.push({
        asset,
        currentPercentage,
        targetPercentage,
        deviation,
        action:
          currentPercentage > (targetPercentage as number) ? "sell" : "buy",
        value: tradeValue,
      });
    }
  }

  return {
    needed: maxDeviation > threshold,
    maxDeviation,
    trades,
    reason:
      maxDeviation > threshold
        ? `Portfolio deviation ${maxDeviation.toFixed(1)}% exceeds threshold ${threshold}%`
        : "Portfolio within target allocation",
  };
}

async function executePortfolioRebalancing(
  sdk: LuxBridgeSDK,
  user: any,
  currentPortfolio: any,
  trades: any[],
) {
  const executedTrades: any[] = [];
  let totalCost = 0;
  let allocationImprovement = 0;

  for (const trade of trades) {
    try {
      // Check if trade is within user's limits
      if (trade.value > user.maxTradeSize) {
        console.log(
          `Trade too large for user limits: ${trade.value} > ${user.maxTradeSize}`,
        );
        continue;
      }

      // Simulate trade execution - in production this would:
      // 1. Execute actual swaps through the AMM
      // 2. Handle token approvals
      // 3. Manage slippage protection

      const tradingFee = trade.value * 0.003; // 0.3% fee
      totalCost += tradingFee;

      executedTrades.push({
        asset: trade.asset,
        action: trade.action,
        value: trade.value,
        fee: tradingFee,
        status: "executed",
        timestamp: new Date().toISOString(),
      });

      // Calculate allocation improvement
      allocationImprovement += Math.abs(trade.deviation);

      console.log(
        `Executed ${trade.action} for ${trade.asset}: $${trade.value}`,
      );
    } catch (error) {
      console.error(`Failed to execute trade for ${trade.asset}:`, error);

      executedTrades.push({
        asset: trade.asset,
        action: trade.action,
        value: trade.value,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    tradesExecuted: executedTrades.length,
    totalCost,
    allocationImprovement: allocationImprovement / trades.length, // Average improvement
    trades: executedTrades,
  };
}

export const maxDuration = 300; // 5 minute timeout
