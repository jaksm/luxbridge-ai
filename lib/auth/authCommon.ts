import { AuthResult, TokenPayload, User } from "../types/user";
import { validateJWT, extractBearerToken } from "./jwtUtils";
import {
  validateCredentials as redisValidateCredentials,
  validatePlatformCredentials as redisValidatePlatformCredentials,
  getUserById as redisGetUserById,
  registerUser as redisRegisterUser,
  registerPlatformUser as redisRegisterPlatformUser,
} from "./redis-users";
import { CreateUserParams, RedisUser } from "../types/redis-user";
import { PlatformType } from "../types/platformAsset";

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
  const redisUser = await redisGetUserById(userId);
  return redisUser ? convertRedisUserToUser(redisUser) : undefined;
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
  const result = await redisValidatePlatformCredentials(platform, email, password);
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
