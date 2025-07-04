import {
  generateClientId,
  generateClientSecret,
  storeClient,
  type OAuthClient,
} from "@/lib/redis-oauth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_name, redirect_uris } = body;

    if (!client_name || !redirect_uris) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: "client_name and redirect_uris are required",
        },
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

    const uris = Array.isArray(redirect_uris) ? redirect_uris : [redirect_uris];
    const validUris = uris.filter((uri) => {
      try {
        new URL(uri);
        return true;
      } catch {
        return false;
      }
    });

    if (validUris.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid redirect URIs",
          details: "At least one valid redirect URI is required",
        },
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

    if (typeof client_name !== "string" || client_name.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Invalid client name",
          details: "Client name must be a non-empty string",
        },
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

    const clientId = generateClientId();
    const clientSecret = generateClientSecret();

    const client: OAuthClient = {
      id: clientId,
      clientId,
      clientSecret,
      name: client_name.trim(),
      redirectUris: validUris,
      createdAt: new Date().toISOString(),
    };

    await storeClient(client);

    return NextResponse.json(
      {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: validUris,
        client_name: client.name,
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
      {
        error: "Error creating client",
        details: "Internal server error occurred",
      },
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

export async function OPTIONS() {
  const response = new NextResponse("OK", { status: 200 });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );

  return response;
}
