import { redis, ensureConnected } from "@/lib/redis";
import { getUserByEmail, createUser } from "./redis-users";
import { PlatformType } from "@/lib/types/platformAsset";

interface UserMapping {
  privyUserId: string;
  redisUserId: string;
  email: string;
  createdAt: string;
}

export async function createUserIdMapping(
  privyUserId: string,
  redisUserId: string,
  email: string,
): Promise<void> {
  await ensureConnected();

  const mapping: UserMapping = {
    privyUserId,
    redisUserId,
    email,
    createdAt: new Date().toISOString(),
  };

  const key = `privy_user_mapping:${privyUserId}`;
  await redis.set(key, JSON.stringify(mapping));
}

export async function getUserIdMapping(
  privyUserId: string,
): Promise<UserMapping | null> {
  await ensureConnected();

  const key = `privy_user_mapping:${privyUserId}`;
  const mappingData = await redis.get(key);

  if (!mappingData) {
    return null;
  }

  return JSON.parse(mappingData) as UserMapping;
}

export async function resolvePrivyUserToRedisUser(
  privyUserId: string,
  email?: string,
  name?: string,
): Promise<string | null> {
  // First, check if mapping already exists
  const existingMapping = await getUserIdMapping(privyUserId);
  if (existingMapping) {
    return existingMapping.redisUserId;
  }

  // If no mapping exists but we have email, try to find existing user
  if (email) {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      // Create mapping for existing user
      await createUserIdMapping(privyUserId, existingUser.userId, email);
      return existingUser.userId;
    }

    // If no existing user and we have name, create new user
    if (name) {
      try {
        const newUser = await createUser({
          email,
          password: `privy_${privyUserId}_${Date.now()}`, // Generate unique password for Privy users
          name,
          scenario: "empty_portfolio",
        });

        // Create mapping for new user
        await createUserIdMapping(privyUserId, newUser.userId, email);
        return newUser.userId;
      } catch (error) {
        console.error("Failed to create user for Privy mapping:", error);
        return null;
      }
    }
  }

  return null;
}

export async function ensureUserExistsForPrivyId(
  privyUserId: string,
  email: string,
  name: string,
): Promise<string | null> {
  // Check if mapping already exists
  const existingMapping = await getUserIdMapping(privyUserId);
  if (existingMapping) {
    return existingMapping.redisUserId;
  }

  // Check if user exists by email
  let user = await getUserByEmail(email);

  // If user doesn't exist, create one
  if (!user) {
    try {
      user = await createUser({
        email,
        password: `privy_${privyUserId}_${Date.now()}`, // Generate unique password
        name,
        scenario: "empty_portfolio",
      });
    } catch (error) {
      console.error("Failed to create user for Privy ID:", error);
      return null;
    }
  }

  // Create the mapping
  await createUserIdMapping(privyUserId, user.userId, email);
  return user.userId;
}

export async function ensureUserExistsForEmail(
  email: string,
  name: string,
  luxUserId: string,
): Promise<string> {
  // First check if a regular user exists with this email
  let user = await getUserByEmail(email);

  if (!user) {
    // Create a new regular user (not platform-specific)
    try {
      user = await createUser({
        email,
        password: `luxbridge_${luxUserId}_${Date.now()}`, // Generate unique password
        name,
        scenario: "empty_portfolio",
      });
    } catch (error) {
      // If user already exists, fetch it
      user = await getUserByEmail(email);
      if (!user) {
        throw new Error(`Failed to create or find user for email: ${email}`);
      }
    }
  }

  return user.userId;
}

export async function deleteUserIdMapping(privyUserId: string): Promise<void> {
  await ensureConnected();
  const key = `privy_user_mapping:${privyUserId}`;
  await redis.del(key);
}

export async function getAllUserMappings(): Promise<UserMapping[]> {
  await ensureConnected();

  const keys = await redis.keys("privy_user_mapping:*");
  const mappings: UserMapping[] = [];

  for (const key of keys) {
    const mappingData = await redis.get(key);
    if (mappingData) {
      mappings.push(JSON.parse(mappingData) as UserMapping);
    }
  }

  return mappings;
}
