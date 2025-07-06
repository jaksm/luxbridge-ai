import { verifyPrivyToken } from "@/lib/auth/privy-verifier";
import { getAuthCode, storeAuthCode } from "@/lib/redis-oauth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth_code, privy_token } = body;

    console.log("OAuth complete request received:", { 
      hasAuthCode: !!auth_code, 
      hasPrivyToken: !!privy_token,
      hasUserData: !!body.user_data
    });

    if (!auth_code || !privy_token) {
      console.error("Missing required fields:", { auth_code: !!auth_code, privy_token: !!privy_token });
      return NextResponse.json(
        { error: "Missing required fields: auth_code and privy_token" },
        { status: 400 },
      );
    }

    console.log("Verifying Privy token...");
    const authInfo = await verifyPrivyToken(request, privy_token);

    if (!authInfo) {
      console.error("Privy token verification failed");
      return NextResponse.json(
        { error: "Invalid Privy token" },
        { status: 401 },
      );
    }

    console.log("Privy token verified for user:", authInfo.userId);

    const existingAuthCode = await getAuthCode(auth_code);

    if (!existingAuthCode) {
      console.error("Authorization code not found or expired:", auth_code);
      return NextResponse.json(
        { error: "Invalid or expired authorization code" },
        { status: 400 },
      );
    }

    console.log("Authorization code found:", existingAuthCode.clientId);

    // Get user data from the frontend (passed during OAuth flow)
    const userData = body.user_data || {};

    await storeAuthCode({
      ...existingAuthCode,
      userId: authInfo.userId,
      userData: {
        email: userData.email,
        privyUserId: userData.privy_user_id || authInfo.userId,
        walletAddress: userData.wallet_address,
      },
    });

    console.log("OAuth flow completed successfully for user:", authInfo.userId);

    return NextResponse.json({
      success: true,
      message: "OAuth flow completed successfully",
      auth_code: auth_code,
    });
  } catch (error) {
    console.error("OAuth complete error:", error);
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
