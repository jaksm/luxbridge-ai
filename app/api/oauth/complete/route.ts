import { verifyPrivyToken } from "@/lib/auth/privy-verifier";
import { getAuthCode, storeAuthCode } from "@/lib/redis-oauth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth_code, privy_token } = body;

    if (!auth_code || !privy_token) {
      return NextResponse.json(
        { error: "Missing required fields: auth_code and privy_token" },
        { status: 400 },
      );
    }

    const authInfo = await verifyPrivyToken(request, privy_token);

    if (!authInfo) {
      return NextResponse.json(
        { error: "Invalid Privy token" },
        { status: 401 },
      );
    }

    const existingAuthCode = await getAuthCode(auth_code);

    if (!existingAuthCode) {
      return NextResponse.json(
        { error: "Invalid or expired authorization code" },
        { status: 400 },
      );
    }

    await storeAuthCode({
      ...existingAuthCode,
      userId: authInfo.userId,
    });

    return NextResponse.json({
      success: true,
      message: "OAuth flow completed successfully",
      auth_code: auth_code,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
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
