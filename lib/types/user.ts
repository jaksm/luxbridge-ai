import { PlatformType, UserPortfolioHolding } from "./platformAsset";

export interface User {
  userId: string;
  email: string;
  password: string;
  name: string;
  scenario: string;
  portfolios: {
    splint_invest: UserPortfolioHolding[];
    masterworks: UserPortfolioHolding[];
    realt: UserPortfolioHolding[];
  };
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  platform: PlatformType;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  userId: string;
  expiresIn: number;
  platform: PlatformType;
}

export interface AuthError {
  error: string;
  message: string;
}

export interface UserInfo {
  userId: string;
  name: string;
  email: string;
  platform: PlatformType;
}
