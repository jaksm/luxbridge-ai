import { User, LoginRequest, LoginResponse, UserInfo } from "@/lib/types/user";
import { UserPortfolioHolding, PlatformType } from "@/lib/types/platformAsset";

export const mockUsers: Record<string, User> = {
  "test@example.com": {
    userId: "test_user_1",
    email: "test@example.com",
    password: "password123",
    name: "Test User",
    scenario: "diversified",
    portfolios: {
      splint_invest: [
        {
          assetId: "WINE-BORDEAUX-001",
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z"
        },
        {
          assetId: "ART-CONTEMP-001",
          sharesOwned: 5,
          acquisitionPrice: 55,
          acquisitionDate: "2024-01-15T00:00:00Z"
        }
      ],
      masterworks: [
        {
          assetId: "ART-MODERN-001",
          sharesOwned: 2,
          acquisitionPrice: 950,
          acquisitionDate: "2024-01-10T00:00:00Z"
        }
      ],
      realt: [
        {
          assetId: "RE-RESIDENTIAL-001",
          sharesOwned: 1,
          acquisitionPrice: 1500,
          acquisitionDate: "2024-01-05T00:00:00Z"
        }
      ]
    }
  },
  "empty@example.com": {
    userId: "empty_user",
    email: "empty@example.com",
    password: "password123",
    name: "Empty Portfolio User",
    scenario: "empty_portfolio",
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: []
    }
  },
  "jaksa.malisic@gmail.com": {
    userId: "demo_user",
    email: "jaksa.malisic@gmail.com",
    password: "demo123",
    name: "Demo User",
    scenario: "empty_portfolio",
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: []
    }
  }
};

export const mockLoginRequests: Record<string, LoginRequest> = {
  valid: {
    email: "test@example.com",
    password: "password123"
  },
  invalid: {
    email: "nonexistent@example.com",
    password: "wrongpassword"
  },
  missing_email: {
    email: "",
    password: "password123"
  },
  missing_password: {
    email: "test@example.com",
    password: ""
  }
};

export const createMockLoginResponse = (platform: PlatformType): LoginResponse => ({
  accessToken: "mock.jwt.token",
  userId: "test_user_1",
  expiresIn: 86400,
  platform
});

export const createMockUserInfo = (platform: PlatformType): UserInfo => ({
  userId: "test_user_1",
  name: "Test User",
  email: "test@example.com",
  platform
});

export const mockPortfolioHoldings: Record<PlatformType, UserPortfolioHolding[]> = {
  splint_invest: [
    {
      assetId: "WINE-BORDEAUX-001",
      sharesOwned: 10,
      acquisitionPrice: 95,
      acquisitionDate: "2024-01-01T00:00:00Z",
      currentValue: 1000,
      unrealizedGain: 50
    }
  ],
  masterworks: [
    {
      assetId: "ART-MODERN-001",
      sharesOwned: 2,
      acquisitionPrice: 950,
      acquisitionDate: "2024-01-10T00:00:00Z",
      currentValue: 2000,
      unrealizedGain: 100
    }
  ],
  realt: [
    {
      assetId: "RE-RESIDENTIAL-001",
      sharesOwned: 1,
      acquisitionPrice: 1500,
      acquisitionDate: "2024-01-05T00:00:00Z",
      currentValue: 1600,
      unrealizedGain: 100
    }
  ]
};
