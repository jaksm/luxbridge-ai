import { AuthResult, TokenPayload, User } from "../types/user";
import { validateJWT, extractBearerToken } from "./jwtUtils";
import {
  validateCredentials as redisValidateCredentials,
  validatePlatformCredentials as redisValidatePlatformCredentials,
  getUserById as redisGetUserById,
  getPlatformUserByEmail as redisGetPlatformUserByEmail,
  registerUser as redisRegisterUser,
  registerPlatformUser as redisRegisterPlatformUser,
} from "./redis-users";
import { CreateUserParams, RedisUser } from "../types/redis-user";
import { PlatformType } from "../types/platformAsset";
import { redis } from "../redis";

function convertRedisUserToUser(redisUser: RedisUser): User {
  return {
    userId: redisUser.userId,
    email: redisUser.email,
    password: "", // Don't expose password hash
    name: redisUser.name,
    scenario: redisUser.scenario,
    portfolios: redisUser.portfolios,
  };
}

export async function validateCredentials(
  email: string,
  password: string,
): Promise<AuthResult> {
  const result = await redisValidateCredentials(email, password);
  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Invalid credentials" };
  }

  return {
    success: true,
    user: convertRedisUserToUser(result.user),
  };
}

export function authenticateToken(authHeader?: string): TokenPayload | null {
  const token = extractBearerToken(authHeader);
  if (!token) return null;
  return validateJWT(token);
}

export async function getUserById(userId: string): Promise<User | undefined> {
  // First try regular user lookup (existing behavior)
  const redisUser = await redisGetUserById(userId);
  if (redisUser) {
    return convertRedisUserToUser(redisUser);
  }

  // Then try platform user lookup (new functionality)
  try {
    const platformUserIdMapping = await redis.get(`platform_user_id:${userId}`);
    if (platformUserIdMapping) {
      const [platform, email] = platformUserIdMapping.split(":");
      const platformUser = await redisGetPlatformUserByEmail(
        platform as PlatformType,
        email,
      );
      if (platformUser) {
        return convertRedisUserToUser(platformUser);
      }
    }
  } catch (error) {
    console.error("Error looking up platform user:", error);
  }

  return undefined;
}

export async function registerUser(
  params: CreateUserParams,
): Promise<AuthResult> {
  const result = await redisRegisterUser(params);
  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Registration failed" };
  }

  return {
    success: true,
    user: convertRedisUserToUser(result.user),
  };
}

export async function validatePlatformCredentials(
  platform: PlatformType,
  email: string,
  password: string,
): Promise<AuthResult> {
  const result = await redisValidatePlatformCredentials(
    platform,
    email,
    password,
  );
  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Invalid credentials" };
  }

  return {
    success: true,
    user: convertRedisUserToUser(result.user),
  };
}

export async function registerPlatformUser(
  params: CreateUserParams & { platform: PlatformType },
): Promise<AuthResult> {
  const result = await redisRegisterPlatformUser(params);
  if (!result.success || !result.user) {
    return { success: false, error: result.error || "Registration failed" };
  }

  return {
    success: true,
    user: convertRedisUserToUser(result.user),
  };
}
