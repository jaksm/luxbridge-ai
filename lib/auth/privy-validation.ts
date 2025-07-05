import { PrivyApi } from "@privy-io/server-auth";
import { LuxBridgeUser, PrivyTokenPayload } from "@/lib/types/luxbridge-auth";
import jwt from "jsonwebtoken";

const privyApi = new PrivyApi({
  appId: process.env.PRIVY_APP_ID || "",
  appSecret: process.env.PRIVY_APP_SECRET || "",
});

export async function validatePrivyToken(token: string): Promise<LuxBridgeUser | null> {
  try {
    const verifiedClaims = await privyApi.verifyAuthToken(token);
    
    if (!verifiedClaims.userId) {
      return null;
    }

    const user = await privyApi.getUser(verifiedClaims.userId);
    
    if (!user) {
      return null;
    }

    const email = user.email?.address || user.linkedAccounts?.find(account => account.type === 'email')?.address;
    
    if (!email) {
      return null;
    }

    const luxBridgeUser: LuxBridgeUser = {
      userId: `lux_${user.id}`,
      privyId: user.id,
      email,
      name: user.email?.address || user.linkedAccounts?.find(account => account.type === 'email')?.address,
      walletAddress: user.wallet?.address,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    return luxBridgeUser;
  } catch (error) {
    console.error("Privy token validation failed:", error);
    return null;
  }
}

export async function validatePrivyTokenMock(token: string): Promise<LuxBridgeUser | null> {
  if (!token || token.length < 10) {
    return null;
  }

  try {
    const decoded = jwt.decode(token) as PrivyTokenPayload;
    
    if (!decoded || !decoded.sub) {
      return null;
    }

    const luxBridgeUser: LuxBridgeUser = {
      userId: `lux_${decoded.sub}`,
      privyId: decoded.sub,
      email: decoded.email || `user_${decoded.sub}@example.com`,
      name: decoded.name || `User ${decoded.sub}`,
      walletAddress: decoded.walletAddress,
      createdAt: new Date(decoded.iat * 1000).toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    return luxBridgeUser;
  } catch (error) {
    console.error("Mock Privy token validation failed:", error);
    return null;
  }
}

export function extractPrivyTokenFromHeader(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.replace('Bearer ', '');
}

export function generateMockPrivyToken(userId: string, email: string): string {
  const payload: PrivyTokenPayload = {
    sub: userId,
    aud: "luxbridge-ai",
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000),
    iss: "privy.io",
    sid: `session_${userId}`,
    email,
    name: `User ${userId}`,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || "mock-secret", { algorithm: 'HS256' });
}