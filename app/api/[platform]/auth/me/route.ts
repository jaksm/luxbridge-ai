import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, getUserById } from "@/lib/auth/authCommon";
import { PlatformType } from "@/lib/types/platformAsset";
import { mapUrlPlatformToType, getSupportedUrlPlatforms } from "@/lib/utils/platform-mapping";

export async function GET(
  request: NextRequest,
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
          message: `Invalid platform specified. Supported platforms: ${getSupportedUrlPlatforms().join(", ")}` 
        },
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

    const user = await getUserById(tokenPayload.userId);
    if (!user) {
      return NextResponse.json(
        { error: "user_not_found", message: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      userId: user.userId,
      name: user.name,
      email: user.email,
      platform,
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
