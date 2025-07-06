import { NextRequest, NextResponse } from "next/server";
import { PlatformType } from "@/lib/types/platformAsset";
import { assetStorage } from "@/lib/storage/redisClient";
import {
  mapUrlPlatformToType,
  getSupportedUrlPlatforms,
} from "@/lib/utils/platform-mapping";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ platform: string; assetId: string }> },
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

    const asset = await assetStorage.getAsset({
      platform,
      assetId: params.assetId,
    });

    if (!asset) {
      return NextResponse.json(
        { error: "asset_not_found", message: "Asset not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(asset);
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
