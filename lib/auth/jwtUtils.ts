import jwt from "jsonwebtoken";
import { TokenPayload } from "../types/user";
import { PlatformType } from "../types/platformAsset";

export function generateJWT(userId: string, platform: PlatformType): string {
  return jwt.sign({ userId, platform }, process.env.JWT_SECRET!, {
    expiresIn: "24h",
  });
}

export function validateJWT(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  return token.length > 0 ? token : null;
}
