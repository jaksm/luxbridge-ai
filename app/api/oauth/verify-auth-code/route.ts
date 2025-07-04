import { NextRequest, NextResponse } from "next/server";
import { getAuthCode } from "@/lib/redis-oauth";

export async function POST(request: NextRequest) {
  try {
    const { auth_code } = await request.json();

    if (!auth_code) {
      return NextResponse.json(
        { error: "Missing auth_code parameter" },
        { status: 400 },
      );
    }

    const authCodeData = await getAuthCode(auth_code);

    if (!authCodeData) {
      return NextResponse.json(
        { error: "Auth code not found or expired" },
        { status: 404 },
      );
    }

    const hasUserId = !!(
      authCodeData.userId && authCodeData.userId.trim() !== ""
    );

    return NextResponse.json({
      success: true,
      hasUserId,
      authCode: {
        code: authCodeData.code,
        clientId: authCodeData.clientId,
        expiresAt: authCodeData.expiresAt,
        hasUser: hasUserId,
      },
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
