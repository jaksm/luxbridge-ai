import { NextRequest, NextResponse } from "next/server";
import { PlatformType } from "@/lib/types/platformAsset";
import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";

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

    const { searchParams } = new URL(request.url);
    const semanticSearch = searchParams.get("semanticSearch");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const minValue = searchParams.get("minValue")
      ? parseFloat(searchParams.get("minValue")!)
      : undefined;
    const maxValue = searchParams.get("maxValue")
      ? parseFloat(searchParams.get("maxValue")!)
      : undefined;
    const riskCategory = searchParams.get("riskCategory");

    const startTime = Date.now();
    let assets;

    if (semanticSearch) {
      const semanticSearcher = new SemanticAssetSearch();
      const assetIds = await semanticSearcher.searchAssets({
        query: semanticSearch,
        platform,
        limit,
        minScore: 0.1,
      });

      assets = await assetStorage.getAssetsByIds(assetIds, platform);
    } else {
      assets = await assetStorage.getAssetsByPlatform({ platform, limit });
    }

    let filteredAssets = assets;

    if (category) {
      filteredAssets = filteredAssets.filter(
        (asset) => asset.category === category,
      );
    }

    if (minValue !== undefined) {
      filteredAssets = filteredAssets.filter(
        (asset) => asset.valuation.currentValue >= minValue,
      );
    }

    if (maxValue !== undefined) {
      filteredAssets = filteredAssets.filter(
        (asset) => asset.valuation.currentValue <= maxValue,
      );
    }

    if (riskCategory) {
      filteredAssets = filteredAssets.filter(
        (asset) =>
          asset.expertAnalysis.riskProfile.riskCategory === riskCategory,
      );
    }

    const searchTimeMs = Date.now() - startTime;

    return NextResponse.json({
      assets: filteredAssets.slice(0, limit),
      total: filteredAssets.length,
      queryMetadata: {
        semanticQuery: semanticSearch,
        filtersApplied: {
          category,
          minValue,
          maxValue,
          riskCategory,
          platform,
        },
        searchTimeMs,
      },
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
