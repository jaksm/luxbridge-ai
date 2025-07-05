import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, getUserById } from "@/lib/auth/authCommon";
import { PlatformType } from "@/lib/types/platformAsset";
import {
  constructUserPortfolio,
  calculateDiversificationScore,
  calculateLiquidityScore,
  calculateRiskScore,
} from "@/lib/utils/portfolioCalculator";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const tokenPayload = authenticateToken(authHeader || undefined);

    if (!tokenPayload) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing token" },
        { status: 401 },
      );
    }

    const user = getUserById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "user_not_found", message: "User not found" },
        { status: 404 },
      );
    }

    const platforms: PlatformType[] = ["splint_invest", "masterworks", "realt"];
    const allAssets = [];
    let totalValue = 0;

    for (const platform of platforms) {
      const holdings = user.portfolios[platform];
      if (holdings.length > 0) {
        try {
          const constructedAssets = await constructUserPortfolio(
            holdings,
            platform,
          );
          allAssets.push(...constructedAssets);
          totalValue += constructedAssets.reduce(
            (sum, asset) => sum + asset.currentValue,
            0,
          );
        } catch (error) {
          console.error(`Error constructing portfolio for ${platform}:`, error);
        }
      }
    }

    const diversificationScore =
      allAssets.length > 0 ? calculateDiversificationScore(allAssets) : 0;
    const liquidityScore =
      allAssets.length > 0 ? calculateLiquidityScore(allAssets) : 0;
    const crossPlatformRisk =
      allAssets.length > 0 ? calculateRiskScore(allAssets) : 0;

    return NextResponse.json({
      portfolioAnalysis: {
        totalValue,
        crossPlatformRisk,
        diversificationScore,
        liquidityScore,
      },
      arbitrageOpportunities: [],
      rebalanceRecommendations:
        allAssets.length === 0
          ? [
              {
                action: "buy" as const,
                platform: "splint_invest" as PlatformType,
                assetId: "recommended_starter_asset",
                reasoning:
                  "Consider starting with a diversified asset to build your portfolio",
              },
            ]
          : [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}

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
