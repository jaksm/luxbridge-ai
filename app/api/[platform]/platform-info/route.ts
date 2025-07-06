import { NextRequest, NextResponse } from "next/server";
import { PlatformType } from "@/lib/types/platformAsset";
import { assetStorage } from "@/lib/storage/redisClient";
import {
  mapUrlPlatformToType,
  getSupportedUrlPlatforms,
} from "@/lib/utils/platform-mapping";

const PLATFORM_NAMES = {
  splint_invest: "Splint Invest",
  masterworks: "Masterworks",
  realt: "RealT",
};

const PLATFORM_DESCRIPTIONS = {
  splint_invest:
    "Fractional investment in luxury assets including wine, art, and collectibles",
  masterworks:
    "Invest in blue-chip contemporary art from artists like Banksy, Basquiat, and Warhol",
  realt: "Fractional real estate investment in income-producing properties",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ platform: string }> },
) {
  try {
    const params = await context.params;
    const urlPlatform = params.platform;
    const platform = mapUrlPlatformToType(urlPlatform);

    if (!platform) {
      return NextResponse.json(
        {
          error: "invalid_platform",
          message: `Invalid platform specified. Supported platforms: ${getSupportedUrlPlatforms().join(", ")}`,
        },
        { status: 400 },
      );
    }

    const existingInfo = await assetStorage.getPlatformInfo(platform);
    if (existingInfo) {
      return NextResponse.json(existingInfo);
    }

    const assets = await assetStorage.getAssetsByPlatform({
      platform,
      limit: 1000,
    });

    const totalValue = assets.reduce(
      (sum, asset) => sum + asset.valuation.currentValue,
      0,
    );
    const categoryCounts = assets.reduce(
      (acc, asset) => {
        if (!acc[asset.category]) {
          acc[asset.category] = { count: 0, totalValue: 0 };
        }
        acc[asset.category].count++;
        acc[asset.category].totalValue += asset.valuation.currentValue;
        return acc;
      },
      {} as Record<string, { count: number; totalValue: number }>,
    );

    const assetCategories = Object.entries(categoryCounts).map(
      ([category, data]) => ({
        category,
        count: data.count,
        totalValue: data.totalValue,
      }),
    );

    const platformInfo = {
      platform,
      name: PLATFORM_NAMES[platform],
      description: PLATFORM_DESCRIPTIONS[platform],
      totalAssets: assets.length,
      totalValue,
      assetCategories,
      supportedFeatures: [
        "asset_discovery",
        "portfolio_management",
        "semantic_search",
        "risk_analysis",
      ],
      lastUpdated: new Date().toISOString(),
    };

    await assetStorage.storePlatformInfo(platformInfo);

    return NextResponse.json(platformInfo);
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
