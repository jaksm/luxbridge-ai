import { PlatformType } from "./platformAsset";

export interface LuxBridgeUser {
  userId: string;
  privyId: string;
  email: string;
  name?: string;
  walletAddress?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface PlatformLink {
  luxUserId: string;
  platform: PlatformType;
  platformUserId: string;
  platformEmail: string;
  accessToken: string;
  tokenExpiry?: number;
  linkedAt: string;
  lastUsedAt: string;
  status: "active" | "expired" | "invalid";
}

export interface AuthSession {
  sessionId: string;
  luxUserId: string;
  privyToken: string;
  platforms: Record<PlatformType, PlatformLink | null>;
  createdAt: string;
  expiresAt: string;
}

export interface PrivyTokenPayload {
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sid: string;
  email?: string;
  name?: string;
  walletAddress?: string;
}

export interface PlatformAuthResult {
  success: boolean;
  user?: {
    userId: string;
    email: string;
    name?: string;
  };
  accessToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface AuthSessionSummary {
  sessionId: string;
  user: LuxBridgeUser;
  linkedPlatforms: Array<{
    platform: PlatformType;
    status: "active" | "expired" | "invalid";
    platformEmail: string;
    linkedAt: string;
    lastUsed: string;
  }>;
  sessionExpiresAt: string;
}

export interface PlatformAuthLink {
  platform: PlatformType;
  authUrl: string;
  expiresAt: string;
  instructions: string;
}

export interface CrossPlatformPortfolioResponse {
  platform: PlatformType;
  portfolio: any;
  metadata: {
    retrievedAt: string;
    platformUserId: string;
    credentialStatus: "active" | "expired" | "invalid";
  };
}

export interface CrossPlatformSearchResult {
  platform: PlatformType;
  assets: any[];
  resultCount: number;
  credentialStatus: "active" | "expired" | "invalid";
}

export interface CrossPlatformSearchResponse {
  results: CrossPlatformSearchResult[];
  summary: {
    totalResults: number;
    platformsSearched: number;
    searchTimeMs: number;
  };
}