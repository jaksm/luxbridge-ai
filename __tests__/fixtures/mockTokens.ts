import { TokenPayload } from "@/lib/types/user";
import { PlatformType } from "@/lib/types/platformAsset";

export const mockTokenPayloads: Record<string, TokenPayload> = {
  valid: {
    userId: "test_user_1",
    platform: "splint_invest",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  },
  expired: {
    userId: "test_user_1",
    platform: "splint_invest", 
    iat: Math.floor(Date.now() / 1000) - 86500,
    exp: Math.floor(Date.now() / 1000) - 100
  },
  platform_mismatch: {
    userId: "test_user_1",
    platform: "masterworks",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  }
};

export const mockJWTTokens = {
  valid: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMSIsInBsYXRmb3JtIjoic3BsaW50X2ludmVzdCIsImlhdCI6MTcwNDEwMjQwMCwiZXhwIjoxNzA0MTg4ODAwfQ.test_signature",
  invalid: "invalid.jwt.token",
  expired: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMSIsInBsYXRmb3JtIjoic3BsaW50X2ludmVzdCIsImlhdCI6MTcwNDEwMjQwMCwiZXhwIjoxNzA0MTAyNTAwfQ.expired_signature",
  malformed: "malformed_token_string"
};

export const mockAuthHeaders = {
  valid: `Bearer ${mockJWTTokens.valid}`,
  invalid: `Bearer ${mockJWTTokens.invalid}`,
  expired: `Bearer ${mockJWTTokens.expired}`,
  malformed: "InvalidBearer format",
  missing: undefined
};

export const createMockTokenPayload = (platform: PlatformType, userId = "test_user_1"): TokenPayload => ({
  userId,
  platform,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400
});

export const createMockBearerToken = (token: string): string => `Bearer ${token}`;

export const mockAPIResponses = {
  unauthorized: {
    error: "unauthorized",
    message: "Invalid or missing token"
  },
  platformMismatch: {
    error: "platform_mismatch", 
    message: "Token platform does not match requested platform"
  },
  invalidCredentials: {
    error: "invalid_credentials",
    message: "Invalid email or password"
  },
  userNotFound: {
    error: "user_not_found",
    message: "User not found"
  },
  assetNotFound: {
    error: "asset_not_found",
    message: "Asset not found"
  },
  invalidPlatform: {
    error: "invalid_platform",
    message: "Invalid platform specified"
  },
  internalError: {
    error: "internal_error",
    message: "An unexpected error occurred"
  }
};
    userId: "test_user_1",
    platform: "splint_invest",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  },
  expired: {
    userId: "test_user_1",
    platform: "splint_invest",
    iat: Math.floor(Date.now() / 1000) - 86500,
    exp: Math.floor(Date.now() / 1000) - 100,
  },
  platform_mismatch: {
    userId: "test_user_1",
    platform: "masterworks",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  },
};
export const mockJWTTokens = {
  valid:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMSIsInBsYXRmb3JtIjoic3BsaW50X2ludmVzdCIsImlhdCI6MTcwNDEwMjQwMCwiZXhwIjoxNzA0MTg4ODAwfQ.test_signature",
  invalid: "invalid.jwt.token",
  expired:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfMSIsInBsYXRmb3JtIjoic3BsaW50X2ludmVzdCIsImlhdCI6MTcwNDEwMjQwMCwiZXhwIjoxNzA0MTAyNTAwfQ.expired_signature",
  malformed: "malformed_token_string",
};
export const mockAuthHeaders = {
  invalid: `Bearer ${mockJWTTokens.invalid}`,
  expired: `Bearer ${mockJWTTokens.expired}`,
  malformed: "InvalidBearer format",
  missing: undefined,
};
export const createMockTokenPayload = (
  platform: PlatformType,
  userId = "test_user_1",
): TokenPayload => ({
  userId,
  platform,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
});
export const createMockBearerToken = (token: string): string =>
  `Bearer ${token}`;
export const mockAPIResponses = {
  unauthorized: {
    error: "unauthorized",
    message: "Invalid or missing token",
  },
  platformMismatch: {
    error: "platform_mismatch",
    message: "Token platform does not match requested platform",
  },
  invalidCredentials: {
    error: "invalid_credentials",
    message: "Invalid email or password",
  },
  userNotFound: {
    error: "user_not_found",
    message: "User not found",
  },
  assetNotFound: {
    error: "asset_not_found",
    message: "Asset not found",
  },
  invalidPlatform: {
    error: "invalid_platform",
    message: "Invalid platform specified",
  },
  internalError: {
    error: "internal_error",
    message: "An unexpected error occurred",
  },
};
