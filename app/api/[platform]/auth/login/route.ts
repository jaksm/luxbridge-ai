import { NextRequest, NextResponse } from "next/server";
import { validatePlatformCredentials } from "@/lib/auth/authCommon";
import { generateJWT } from "@/lib/auth/jwtUtils";
import { PlatformType } from "@/lib/types/platformAsset";
import { mapUrlPlatformToType, getSupportedUrlPlatforms } from "@/lib/utils/platform-mapping";

export async function POST(
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

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "missing_credentials",
          message: "Email and password are required",
        },
        { status: 400 },
      );
    }

    const result = await validatePlatformCredentials(platform, email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: "invalid_credentials", message: "Invalid email or password" },
        { status: 401 },
      );
    }

    const accessToken = generateJWT(result.user!.userId, platform);

    return NextResponse.json({
      accessToken,
      userId: result.user!.userId,
      expiresIn: 86400,
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
