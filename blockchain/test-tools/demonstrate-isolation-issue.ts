#!/usr/bin/env npx tsx

/**
 * Demonstration of Portfolio Tool User Data Isolation Issue
 * 
 * This script demonstrates the exact problem without requiring Redis.
 * It shows how the current getUserById implementation fails for platform users.
 */

interface MockRedisUser {
  userId: string;
  email: string;
  passwordHash: string;
  name: string;
  scenario: string;
  portfolios: Record<string, any[]>;
  createdAt: string;
  updatedAt: string;
}

interface User {
  userId: string;
  email: string;
  password: string;
  name: string;
  scenario: string;
  portfolios: Record<string, any[]>;
}

// Mock Redis storage
const mockRedis = {
  // LuxBridge user storage
  users: new Map<string, MockRedisUser>(),      // user:{email} -> user data
  userIds: new Map<string, string>(),           // user_id:{userId} -> email
  
  // Platform user storage  
  platformUsers: new Map<string, MockRedisUser>(),   // platform_user:{platform}:{email} -> user data
  platformUserIds: new Map<string, string>(),        // platform_user_id:{userId} -> {platform}:{email}
  
  // Mock Redis operations
  get: (key: string) => {
    if (key.startsWith('user_id:')) {
      return mockRedis.userIds.get(key);
    }
    if (key.startsWith('platform_user_id:')) {
      return mockRedis.platformUserIds.get(key);
    }
    return null;
  },
  
  hGetAll: (key: string) => {
    if (key.startsWith('user:')) {
      const user = mockRedis.users.get(key);
      return user ? {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        scenario: user.scenario,
        portfolios: JSON.stringify(user.portfolios),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : null;
    }
    if (key.startsWith('platform_user:')) {
      const user = mockRedis.platformUsers.get(key);
      return user ? {
        userId: user.userId,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        scenario: user.scenario,
        portfolios: JSON.stringify(user.portfolios),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      } : null;
    }
    return null;
  }
};

// Mock user creation functions
function createLuxBridgeUser(email: string, name: string): MockRedisUser {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const user: MockRedisUser = {
    userId,
    email,
    passwordHash: 'hashed_password',
    name,
    scenario: 'empty_portfolio',
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Store in mock Redis
  mockRedis.users.set(`user:${email}`, user);
  mockRedis.userIds.set(`user_id:${userId}`, email);
  
  return user;
}

function createPlatformUser(email: string, name: string, platform: string): MockRedisUser {
  const userId = `${platform}_user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const user: MockRedisUser = {
    userId,
    email,
    passwordHash: 'hashed_password',
    name,
    scenario: 'empty_portfolio',
    portfolios: {
      splint_invest: [],
      masterworks: [],
      realt: [],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Store in mock Redis  
  mockRedis.platformUsers.set(`platform_user:${platform}:${email}`, user);
  mockRedis.platformUserIds.set(`platform_user_id:${userId}`, `${platform}:${email}`);
  
  return user;
}

// Current getUserById implementation (from authCommon.ts)
async function getCurrentGetUserById(userId: string): Promise<User | undefined> {
  // This only works for LuxBridge users
  const email = mockRedis.get(`user_id:${userId}`);
  if (!email) {
    return undefined;
  }
  
  const userData = mockRedis.hGetAll(`user:${email}`);
  if (!userData || !userData.userId) {
    return undefined;
  }
  
  return {
    userId: userData.userId,
    email: userData.email,
    password: "",
    name: userData.name,
    scenario: userData.scenario,
    portfolios: JSON.parse(userData.portfolios),
  };
}

// Proposed unified getUserById implementation
async function getUnifiedGetUserById(userId: string): Promise<User | undefined> {
  // First try regular user lookup (existing behavior)
  const regularUser = await getCurrentGetUserById(userId);
  if (regularUser) {
    return regularUser;
  }
  
  // Then try platform user lookup (new functionality)
  const platformUserIdMapping = mockRedis.get(`platform_user_id:${userId}`);
  if (platformUserIdMapping) {
    const [platform, email] = platformUserIdMapping.split(':');
    const userData = mockRedis.hGetAll(`platform_user:${platform}:${email}`);
    if (userData && userData.userId) {
      return {
        userId: userData.userId,
        email: userData.email,
        password: "",
        name: userData.name,
        scenario: userData.scenario,
        portfolios: JSON.parse(userData.portfolios),
      };
    }
  }
  
  return undefined;
}

// Portfolio tool simulation
async function simulatePortfolioTool(userId: string, platform: string, getUserByIdFunc: Function) {
  try {
    const user = await getUserByIdFunc(userId);
    if (!user) {
      return {
        success: false,
        message: `User not found: ${userId}`,
      };
    }
    
    const holdings = user.portfolios[platform];
    if (holdings.length === 0) {
      return {
        success: true,
        message: `No holdings found for user ${userId} on platform ${platform}`,
      };
    }
    
    return {
      success: true,
      message: `Portfolio for ${userId} on ${platform}: ${holdings.length} holdings`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error retrieving portfolio: ${error}`,
    };
  }
}

// Main demonstration
async function demonstrateIssue() {
  console.log("🔍 Demonstrating Portfolio Tool User Data Isolation Issue\n");
  
  // Create test users
  console.log("📝 Creating test users...");
  const luxUser = createLuxBridgeUser("lux@example.com", "LuxBridge User");
  const platformUser = createPlatformUser("platform@example.com", "Platform User", "splint_invest");
  
  console.log(`   ✓ LuxBridge user created: ${luxUser.userId}`);
  console.log(`   ✓ Platform user created: ${platformUser.userId}`);
  
  console.log("\n📊 Testing Current Implementation:");
  console.log("=" * 50);
  
  // Test current implementation with LuxBridge user
  console.log("\n1. Testing LuxBridge user with current getUserById:");
  const luxResult1 = await simulatePortfolioTool(luxUser.userId, "splint_invest", getCurrentGetUserById);
  console.log(`   Result: ${luxResult1.success ? '✅' : '❌'} ${luxResult1.message}`);
  
  // Test current implementation with platform user
  console.log("\n2. Testing platform user with current getUserById:");
  const platformResult1 = await simulatePortfolioTool(platformUser.userId, "splint_invest", getCurrentGetUserById);
  console.log(`   Result: ${platformResult1.success ? '✅' : '❌'} ${platformResult1.message}`);
  
  console.log("\n📈 Testing Proposed Solution:");
  console.log("=" * 50);
  
  // Test unified implementation with LuxBridge user
  console.log("\n3. Testing LuxBridge user with unified getUserById:");
  const luxResult2 = await simulatePortfolioTool(luxUser.userId, "splint_invest", getUnifiedGetUserById);
  console.log(`   Result: ${luxResult2.success ? '✅' : '❌'} ${luxResult2.message}`);
  
  // Test unified implementation with platform user
  console.log("\n4. Testing platform user with unified getUserById:");
  const platformResult2 = await simulatePortfolioTool(platformUser.userId, "splint_invest", getUnifiedGetUserById);
  console.log(`   Result: ${platformResult2.success ? '✅' : '❌'} ${platformResult2.message}`);
  
  console.log("\n📋 Summary:");
  console.log("=" * 50);
  console.log("Current Implementation:");
  console.log(`   LuxBridge users: ${luxResult1.success ? '✅ Works' : '❌ Fails'}`);
  console.log(`   Platform users:  ${platformResult1.success ? '✅ Works' : '❌ Fails'}`);
  
  console.log("\nProposed Solution:");
  console.log(`   LuxBridge users: ${luxResult2.success ? '✅ Works' : '❌ Fails'}`);
  console.log(`   Platform users:  ${platformResult2.success ? '✅ Works' : '❌ Fails'}`);
  
  // Show Redis key structure
  console.log("\n🔑 Redis Key Structure:");
  console.log("=" * 50);
  console.log("LuxBridge User Keys:");
  console.log(`   user:${luxUser.email} -> [user data]`);
  console.log(`   user_id:${luxUser.userId} -> ${luxUser.email}`);
  
  console.log("\nPlatform User Keys:");
  console.log(`   platform_user:splint_invest:${platformUser.email} -> [user data]`);
  console.log(`   platform_user_id:${platformUser.userId} -> splint_invest:${platformUser.email}`);
  
  console.log("\n🎯 Key Insight:");
  console.log("The current getUserById only checks 'user_id:*' keys,");
  console.log("but platform users use 'platform_user_id:*' keys.");
  console.log("The unified solution checks both key patterns.");
  
  if (!platformResult1.success && platformResult2.success) {
    console.log("\n✅ ISSUE CONFIRMED: Platform users fail with current implementation but work with proposed solution.");
  } else {
    console.log("\n❌ UNEXPECTED: Results don't match expected behavior.");
  }
}

// Run the demonstration
demonstrateIssue().catch(console.error);