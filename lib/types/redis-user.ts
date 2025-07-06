import { PlatformType, UserPortfolioHolding } from "./platformAsset";

export interface RedisUser {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  scenario: string;
  portfolios: {
    splint_invest: UserPortfolioHolding[];
    masterworks: UserPortfolioHolding[];
    realt: UserPortfolioHolding[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  scenario?: string;
}

export interface UpdateUserParams {
  name?: string;
  scenario?: string;
}

export interface PortfolioUpdateParams {
  userId: string;
  platform: PlatformType;
  asset: UserPortfolioHolding;
}

export interface RedisUserAuthResult {
  success: boolean;
  user?: RedisUser;
  error?: string;
}
