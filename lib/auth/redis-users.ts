import * as bcrypt from "bcryptjs";
import { redis } from "../redis";
import { PlatformType, UserPortfolioHolding } from "../types/platformAsset";
import {
  RedisUser,
  CreateUserParams,
  UpdateUserParams,
  PortfolioUpdateParams,
  RedisUserAuthResult,
} from "../types/redis-user";

async function ensureConnected() {
  if (!redis.isReady) {
    await redis.connect();
  }
}

export async function createUser(params: CreateUserParams): Promise<RedisUser> {
  await ensureConnected();

  const { email, password, name, scenario = "empty_portfolio" } = params;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const passwordHash = await bcrypt.hash(password, 12);

  const user: RedisUser = {
    userId,
    email,
    passwordHash,
    name,
    scenario,
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const key = `user:${email}`;
  await redis.hSet(key, {
    userId: user.userId,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    scenario: user.scenario,
    portfolios: JSON.stringify(user.portfolios),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  await redis.set(`user_id:${userId}`, email);

  return user;
}

export async function createPlatformUser(
  params: CreateUserParams & { platform: PlatformType },
): Promise<RedisUser> {
  await ensureConnected();

  const { email, password, name, platform, scenario = "empty_portfolio" } = params;

  const existingUser = await getPlatformUserByEmail(platform, email);
  if (existingUser) {
    throw new Error("User already exists on this platform");
  }

  const userId = `${platform}_user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const passwordHash = await bcrypt.hash(password, 12);

  const user: RedisUser = {
    userId,
    email,
    passwordHash,
    name,
    scenario,
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const key = `platform_user:${platform}:${email}`;
  await redis.hSet(key, {
    userId: user.userId,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    scenario: user.scenario,
    portfolios: JSON.stringify(user.portfolios),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });

  await redis.set(`platform_user_id:${userId}`, `${platform}:${email}`);

  return user;
}

export async function getUserByEmail(email: string): Promise<RedisUser | null> {
  await ensureConnected();

  const key = `user:${email}`;
  const userData = await redis.hGetAll(key);

  if (!userData.userId) {
    return null;
  }

  return {
    userId: userData.userId,
    email: userData.email,
    passwordHash: userData.passwordHash,
    name: userData.name,
    scenario: userData.scenario,
    portfolios: JSON.parse(userData.portfolios),
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };
}

export async function getPlatformUserByEmail(
  platform: PlatformType,
  email: string,
): Promise<RedisUser | null> {
  await ensureConnected();

  const key = `platform_user:${platform}:${email}`;
  const userData = await redis.hGetAll(key);

  if (!userData.userId) {
    return null;
  }

  return {
    userId: userData.userId,
    email: userData.email,
    passwordHash: userData.passwordHash,
    name: userData.name,
    scenario: userData.scenario,
    portfolios: JSON.parse(userData.portfolios),
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
  };
}

export async function getUserById(userId: string): Promise<RedisUser | null> {
  await ensureConnected();

  const email = await redis.get(`user_id:${userId}`);
  if (!email) {
    return null;
  }

  return await getUserByEmail(email);
}

export async function validateCredentials(
  email: string,
  password: string,
): Promise<RedisUserAuthResult> {
  const user = await getUserByEmail(email);
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  return { success: true, user };
}

export async function validatePlatformCredentials(
  platform: PlatformType,
  email: string,
  password: string,
): Promise<RedisUserAuthResult> {
  const user = await getPlatformUserByEmail(platform, email);
  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Invalid credentials" };
  }

  return { success: true, user };
}

export async function updateUser(
  userId: string,
  updates: UpdateUserParams,
): Promise<RedisUser | null> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const key = `user:${user.email}`;
  await redis.hSet(key, {
    name: updatedUser.name,
    scenario: updatedUser.scenario,
    updatedAt: updatedUser.updatedAt,
  });

  return updatedUser;
}

export async function addAssetToPortfolio(
  userId: string,
  platform: PlatformType,
  asset: UserPortfolioHolding,
): Promise<RedisUser | null> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const existingAssetIndex = user.portfolios[platform].findIndex(
    (holding) => holding.assetId === asset.assetId,
  );

  if (existingAssetIndex >= 0) {
    user.portfolios[platform][existingAssetIndex] = asset;
  } else {
    user.portfolios[platform].push(asset);
  }

  user.updatedAt = new Date().toISOString();

  const key = `user:${user.email}`;
  await redis.hSet(key, {
    portfolios: JSON.stringify(user.portfolios),
    updatedAt: user.updatedAt,
  });

  return user;
}

export async function removeAssetFromPortfolio(
  userId: string,
  platform: PlatformType,
  assetId: string,
): Promise<RedisUser | null> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  user.portfolios[platform] = user.portfolios[platform].filter(
    (holding) => holding.assetId !== assetId,
  );

  user.updatedAt = new Date().toISOString();

  const key = `user:${user.email}`;
  await redis.hSet(key, {
    portfolios: JSON.stringify(user.portfolios),
    updatedAt: user.updatedAt,
  });

  return user;
}

export async function updatePortfolioAsset(
  userId: string,
  platform: PlatformType,
  assetId: string,
  updates: Partial<UserPortfolioHolding>,
): Promise<RedisUser | null> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  const assetIndex = user.portfolios[platform].findIndex(
    (holding) => holding.assetId === assetId,
  );

  if (assetIndex === -1) {
    return null;
  }

  user.portfolios[platform][assetIndex] = {
    ...user.portfolios[platform][assetIndex],
    ...updates,
  };

  user.updatedAt = new Date().toISOString();

  const key = `user:${user.email}`;
  await redis.hSet(key, {
    portfolios: JSON.stringify(user.portfolios),
    updatedAt: user.updatedAt,
  });

  return user;
}

export async function getUserPortfolio(
  userId: string,
  platform?: PlatformType,
): Promise<
  UserPortfolioHolding[] | Record<PlatformType, UserPortfolioHolding[]> | null
> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return null;
  }

  if (platform) {
    return user.portfolios[platform];
  }

  return user.portfolios;
}

export async function registerUser(
  params: CreateUserParams,
): Promise<RedisUserAuthResult> {
  try {
    const user = await createUser(params);
    return { success: true, user };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: errorMessage };
  }
}

export async function registerPlatformUser(
  params: CreateUserParams & { platform: PlatformType },
): Promise<RedisUserAuthResult> {
  try {
    const user = await createPlatformUser(params);
    return { success: true, user };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed";
    return { success: false, error: errorMessage };
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  await ensureConnected();

  const user = await getUserById(userId);
  if (!user) {
    return false;
  }

  const userKey = `user:${user.email}`;
  const userIdKey = `user_id:${userId}`;

  await redis.del(userKey);
  await redis.del(userIdKey);

  return true;
}

export async function getAllUsers(): Promise<RedisUser[]> {
  await ensureConnected();

  const keys = await redis.keys("user:*");
  const users: RedisUser[] = [];

  for (const key of keys) {
    if (key.startsWith("user_id:")) continue;

    const userData = await redis.hGetAll(key);
    if (userData.userId) {
      users.push({
        userId: userData.userId,
        email: userData.email,
        passwordHash: userData.passwordHash,
        name: userData.name,
        scenario: userData.scenario,
        portfolios: JSON.parse(userData.portfolios),
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      });
    }
  }

  return users;
}
