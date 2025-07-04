import { NextRequest, NextResponse } from "next/server";
import { storeAuthCode, getClient } from "@/lib/redis-oauth";

export async function POST(request: NextRequest) {
  try {
    const {
      auth_code,
      client_id,
      redirect_uri,
      code_challenge,
      code_challenge_method,
    } = await request.json();

    if (!auth_code || !client_id || !redirect_uri) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    const client = await getClient(client_id);
    if (!client) {
      return NextResponse.json({ error: "Invalid client_id" }, { status: 400 });
    }

    if (!client.redirectUris.includes(redirect_uri)) {
      return NextResponse.json(
        { error: "Invalid redirect_uri" },
        { status: 400 },
      );
    }

    const authCode = {
      code: auth_code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      clientId: client_id,
      userId: "",
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    };

    await storeAuthCode(authCode);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
