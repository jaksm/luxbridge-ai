import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/auth/authCommon";
import { PlatformType } from "@/lib/types/platformAsset";
import {
  constructUserPortfolio,
  calculatePortfolioMetrics,
} from "@/lib/utils/portfolioCalculator";
import {
  createPlatformHandler,
  AuthenticatedRequest,
} from "@/lib/auth/platform-middleware";

async function handlePortfolioRequest(
  request: AuthenticatedRequest,
  platform: string,
) {
  const platformType = platform as PlatformType;
  const userId = request.user.userId;

  try {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const holdings = user.portfolios[platformType];

    if (holdings.length === 0) {
      return {
        userId: user.userId,
        totalValue: 0,
        currency: "USD",
        assets: [],
        platformSummary: {
          totalAssets: 0,
          assetCategories: {},
        },
        lastUpdated: new Date().toISOString(),
      };
    }

    const constructedAssets = await constructUserPortfolio(
      holdings,
      platformType,
    );
    const metrics = calculatePortfolioMetrics(constructedAssets);

    const categories = constructedAssets.reduce(
      (acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId: user.userId,
      totalValue: metrics.totalValue,
      currency: "USD",
      assets: constructedAssets,
      platformSummary: {
        totalAssets: constructedAssets.length,
        assetCategories: categories,
      },
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error("Failed to retrieve portfolio");
  }
}

export const GET = createPlatformHandler(handlePortfolioRequest);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
