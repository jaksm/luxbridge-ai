import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, getUserById } from "@/lib/auth/authCommon";
import { PlatformType } from "@/lib/types/platformAsset";
import {
  constructUserPortfolio,
  calculatePortfolioMetrics,
} from "@/lib/utils/portfolioCalculator";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const params = await context.params;
    const platform = params.platform as PlatformType;
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return NextResponse.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const tokenPayload = authenticateToken(authHeader || undefined);

    if (!tokenPayload) {
      return NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing token" },
        { status: 401 },
      );
    }

    if (tokenPayload.platform !== platform) {
      return NextResponse.json(
        {
          error: "platform_mismatch",
          message: "Token platform does not match requested platform",
        },
        { status: 403 },
      );
    }

    const user = getUserById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "user_not_found", message: "User not found" },
        { status: 404 },
      );
    }

    const holdings = user.portfolios[platform];

    if (holdings.length === 0) {
      return NextResponse.json({
        userId: user.userId,
        totalValue: 0,
        currency: "USD",
        assets: [],
        platformSummary: {
          totalAssets: 0,
          assetCategories: {},
        },
        lastUpdated: new Date().toISOString(),
      });
    }

    const constructedAssets = await constructUserPortfolio(holdings, platform);
    const metrics = calculatePortfolioMetrics(constructedAssets);

    const categories = constructedAssets.reduce(
      (acc, asset) => {
        acc[asset.category] = (acc[asset.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      userId: user.userId,
      totalValue: metrics.totalValue,
      currency: "USD",
      assets: constructedAssets,
      platformSummary: {
        totalAssets: constructedAssets.length,
        assetCategories: categories,
      },
      lastUpdated: new Date().toISOString(),
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
