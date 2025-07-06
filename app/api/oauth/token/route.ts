import {
  deleteAuthCode,
  generateAccessToken,
  getAuthCode,
  getClient,
  storeAccessToken,
} from "@/lib/redis-oauth";
import {
  createAuthSession,
  storeLuxBridgeUser,
} from "@/lib/auth/session-manager";
import { ensureUserExistsForPrivyId } from "@/lib/auth/user-id-mapping";
import { LuxBridgeUser } from "@/lib/types/luxbridge-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse("OK", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  let formData: FormData;
  let grant_type: string;
  let code: string;
  let redirect_uri: string;
  let client_id: string;
  let client_secret: string | null;
  let code_verifier: string | undefined;

  try {
    formData = await request.formData();
    grant_type = formData.get("grant_type") as string;
    code = formData.get("code") as string;
    redirect_uri = formData.get("redirect_uri") as string;
    client_id = formData.get("client_id") as string;
    client_secret = formData.get("client_secret") as string | null;
    code_verifier = formData.get("code_verifier") as string | undefined;
  } catch (parseError) {
    return NextResponse.json(
      { error: "Invalid request format" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }

  if (grant_type !== "authorization_code") {
    return NextResponse.json(
      { error: "Unsupported grant type" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }

  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json(
      { error: "Invalid request" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }

  try {
    const client = await getClient(client_id);
    if (!client) {
      return NextResponse.json(
        { error: "Invalid client" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    const authCode = await getAuthCode(code);
    if (!authCode) {
      return NextResponse.json(
        { error: "Invalid code" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    if (authCode.clientId !== client_id) {
      return NextResponse.json(
        { error: "Invalid code" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json(
        { error: "Invalid code" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    if (!authCode.userId || authCode.userId.trim() === "") {
      return NextResponse.json(
        { error: "Auth code not yet associated with user" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    const expiresAt = new Date(authCode.expiresAt);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Code expired" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }
    let pkceValid = false;
    if (authCode.codeChallenge) {
      if (!code_verifier) {
        return NextResponse.json(
          { error: "Missing code_verifier for PKCE" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          },
        );
      }
      if (authCode.codeChallengeMethod === "S256") {
        const hash = require("crypto")
          .createHash("sha256")
          .update(code_verifier)
          .digest();
        const base64url = hash
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        pkceValid = base64url === authCode.codeChallenge;
      } else if (
        authCode.codeChallengeMethod === "plain" ||
        !authCode.codeChallengeMethod
      ) {
        pkceValid = code_verifier === authCode.codeChallenge;
      }
      if (!pkceValid) {
        return NextResponse.json(
          { error: "Invalid code_verifier for PKCE" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
          },
        );
      }
    }

    if (
      !authCode.codeChallenge &&
      client.clientSecret &&
      client.clientSecret !== client_secret
    ) {
      return NextResponse.json(
        { error: "Invalid client" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      );
    }

    await deleteAuthCode(code);

    // Create LuxBridge user and session
    let sessionId: string | undefined;
    if (authCode.userData) {
      const luxUser: LuxBridgeUser = {
        userId: authCode.userId,
        email: authCode.userData.email || "",
        name: authCode.userData.email?.split("@")[0] || "User",
        privyId: authCode.userData.privyUserId || authCode.userId,
        walletAddress: authCode.userData.walletAddress,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      await storeLuxBridgeUser(luxUser);
      sessionId = await createAuthSession(luxUser.userId, "");

      // Create user ID mapping for portfolio tools
      if (authCode.userData.privyUserId && authCode.userData.email) {
        await ensureUserExistsForPrivyId(
          authCode.userData.privyUserId,
          authCode.userData.email,
          luxUser.name || "User",
        );
      }
    }

    const accessToken = generateAccessToken();
    const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await storeAccessToken({
      token: accessToken,
      expiresAt: tokenExpiresAt.toISOString(),
      clientId: client_id,
      userId: authCode.userId,
      sessionId,
      userData: authCode.userData,
    });

    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Server error" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      },
    );
  }
}
