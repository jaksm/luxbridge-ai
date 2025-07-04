import { getAccessToken } from "@/lib/redis-oauth";
import { NextRequest } from "next/server";

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    const accessToken = await getAccessToken(token);

    if (!accessToken) {
      return null;
    }

    if (new Date(accessToken.expiresAt) < new Date()) {
      return null;
    }

    return accessToken;
  } catch (e) {
    return null;
  }
}
