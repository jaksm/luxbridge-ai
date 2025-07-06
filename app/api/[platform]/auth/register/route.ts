import { NextRequest, NextResponse } from "next/server";
import { registerPlatformUser } from "@/lib/auth/authCommon";
import { generateJWT } from "@/lib/auth/jwtUtils";
import { PlatformType } from "@/lib/types/platformAsset";
import { mapUrlPlatformToType, getSupportedUrlPlatforms } from "@/lib/utils/platform-mapping";
import { z } from "zod";

const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
});

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

    const body = await request.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Invalid input data",
          details: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const { email, password, name } = validation.data;

    const result = await registerPlatformUser({
      email,
      password,
      name,
      platform,
      scenario: "empty_portfolio",
    });

    if (!result.success) {
      const status = result.error === "User already exists" ? 409 : 400;
      return NextResponse.json(
        {
          error: "registration_failed",
          message: result.error || "Registration failed",
        },
        { status },
      );
    }

    const accessToken = generateJWT(result.user!.userId, platform);

    return NextResponse.json({
      accessToken,
      userId: result.user!.userId,
      expiresIn: 86400,
      platform,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Registration error:", error);
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
