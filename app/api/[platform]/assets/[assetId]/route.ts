import { NextRequest, NextResponse } from "next/server";
import { PlatformType } from "@/lib/types/platformAsset";
import { assetStorage } from "@/lib/storage/redisClient";

export async function GET(
  _request: NextRequest, 
  context: { params: Promise<{ platform: string; assetId: string }> }
) {
  try {
    const params = await context.params;
    const platform = params.platform as PlatformType;
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return NextResponse.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
        { status: 400 }
      );
    }

    const asset = await assetStorage.getAsset({
      platform,
      assetId: params.assetId
    });

    if (!asset) {
      return NextResponse.json(
        { error: "asset_not_found", message: "Asset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(asset);

  } catch (error) {
    return NextResponse.json(
      { error: "internal_error", message: "An unexpected error occurred" },
      { status: 500 }
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
import { assetStorage } from "@/lib/storage/redisClient";
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ platform: string; assetId: string }> },
) {
  try {
    const params = await context.params;
    if (!["splint_invest", "masterworks", "realt"].includes(platform)) {
      return NextResponse.json(
        { error: "invalid_platform", message: "Invalid platform specified" },
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
