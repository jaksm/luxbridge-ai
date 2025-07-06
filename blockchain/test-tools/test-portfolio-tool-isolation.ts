import { getUserById } from "@/lib/auth/authCommon";
import { 
  createUser, 
  createPlatformUser, 
  getUserByEmail, 
  getPlatformUserByEmail 
} from "@/lib/auth/redis-users";
import { registerGetUserPortfolioTool } from "@/lib/tools/get-user-portfolio-tool";
import { redis } from "@/lib/redis";
import { PlatformType } from "@/lib/types/platformAsset";

interface TestUser {
  userId: string;
  email: string;
  type: 'luxbridge' | 'platform';
  platform?: PlatformType;
}

// Mock MCP server for testing
const createMockMCPServer = () => ({
  tool: (() => {
    const mockFn = () => {};
    mockFn.mock = { calls: [[null, null, null, async () => ({ content: [{ text: "test" }] })]] };
    return mockFn;
  })(),
});

// Test execution functions
export async function runPortfolioToolIsolationTest() {
  console.log("🔍 Running Portfolio Tool User Data Isolation Test...\n");
  
  // Ensure Redis is connected
  if (!redis.isReady) {
    await redis.connect();
  }

  const testUsers: TestUser[] = [];

  const cleanup = async () => {
    for (const user of testUsers) {
      try {
        if (user.type === 'luxbridge') {
          await redis.del(`user:${user.email}`);
          await redis.del(`user_id:${user.userId}`);
        } else if (user.type === 'platform' && user.platform) {
          await redis.del(`platform_user:${user.platform}:${user.email}`);
          await redis.del(`platform_user_id:${user.userId}`);
        }
      } catch (error) {
        console.warn(`Failed to clean up test user ${user.userId}:`, error);
      }
    }
  };

  try {
    // Run individual test scenarios
    await testUserCreationAndRetrieval(testUsers);
    await testDataIsolation(testUsers);
    await testPortfolioToolCompatibility(testUsers);
    await testProposedSolution(testUsers);
    
    console.log("\n✅ Portfolio Tool Isolation Test completed successfully!");
  } catch (error) {
    console.error("❌ Portfolio Tool Isolation Test failed:", error);
    throw error;
  } finally {
    await cleanup();
  }
}

async function testUserCreationAndRetrieval(testUsers: TestUser[]) {
  console.log("1. Testing User Creation and Retrieval...");
  
  // Test LuxBridge user
  const luxUser = await createUser({
    email: "luxtest@example.com",
    password: "password123",
    name: "Lux Test User",
    scenario: "empty_portfolio",
  });
  
  testUsers.push({
    userId: luxUser.userId,
    email: luxUser.email,
    type: 'luxbridge',
  });
  
  const luxRetrieved = await getUserById(luxUser.userId);
  console.log(`   LuxBridge user retrieval: ${luxRetrieved ? '✓' : '✗'}`);
  
  // Test platform user
  const platformUser = await createPlatformUser({
    email: "platformtest@example.com",
    password: "password123",
    name: "Platform Test User",
    platform: "splint_invest",
    scenario: "empty_portfolio",
  });
  
  testUsers.push({
    userId: platformUser.userId,
    email: platformUser.email,
    type: 'platform',
    platform: "splint_invest",
  });
  
  const platformRetrieved = await getUserById(platformUser.userId);
  console.log(`   Platform user retrieval: ${platformRetrieved ? '✗ (should be null)' : '✓'}`);
  
  // Verify platform user exists but not accessible via getUserById
  const platformRetrievedDirect = await getPlatformUserByEmail("splint_invest", platformUser.email);
  console.log(`   Platform user direct retrieval: ${platformRetrievedDirect ? '✓' : '✗'}`);
}

async function testDataIsolation(testUsers: TestUser[]) {
  console.log("\n2. Testing Data Isolation...");
  
  const email = "isolation@test.com";
  
  // Create both user types with same email
  const luxUser = await createUser({
    email,
    password: "password123",
    name: "Isolation Test User",
    scenario: "empty_portfolio",
  });
  
  const platformUser = await createPlatformUser({
    email,
    password: "password123",
    name: "Isolation Test User",
    platform: "masterworks",
    scenario: "empty_portfolio",
  });
  
  testUsers.push(
    {
      userId: luxUser.userId,
      email: luxUser.email,
      type: 'luxbridge',
    },
    {
      userId: platformUser.userId,
      email: platformUser.email,
      type: 'platform',
      platform: "masterworks",
    }
  );
  
  console.log(`   Different user IDs: ${luxUser.userId !== platformUser.userId ? '✓' : '✗'}`);
  console.log(`   LuxBridge user ID: ${luxUser.userId}`);
  console.log(`   Platform user ID: ${platformUser.userId}`);
  
  // Verify they can be retrieved separately
  const luxRetrieved = await getUserByEmail(email);
  const platformRetrieved = await getPlatformUserByEmail("masterworks", email);
  
  console.log(`   LuxBridge user by email: ${luxRetrieved?.userId === luxUser.userId ? '✓' : '✗'}`);
  console.log(`   Platform user by email: ${platformRetrieved?.userId === platformUser.userId ? '✓' : '✗'}`);
  
  // Verify getUserById isolation
  const luxByIdAuth = await getUserById(luxUser.userId);
  const platformByIdAuth = await getUserById(platformUser.userId);
  
  console.log(`   LuxBridge user by ID (authCommon): ${luxByIdAuth?.userId === luxUser.userId ? '✓' : '✗'}`);
  console.log(`   Platform user by ID (authCommon): ${platformByIdAuth ? '✗ (should be null)' : '✓'}`);
}

async function testPortfolioToolCompatibility(testUsers: TestUser[]) {
  console.log("\n3. Testing Portfolio Tool Compatibility...");
  
  // Create platform user
  const platformUser = await createPlatformUser({
    email: "portfoliotest@example.com",
    password: "password123",
    name: "Portfolio Test User",
    platform: "realt",
    scenario: "empty_portfolio",
  });
  
  testUsers.push({
    userId: platformUser.userId,
    email: platformUser.email,
    type: 'platform',
    platform: "realt",
  });
  
  // Try to use getUserById (this will fail for platform users)
  const retrieved = await getUserById(platformUser.userId);
  console.log(`   getUserById with platform user: ${retrieved ? '✗ (should fail)' : '✓ (correctly fails)'}`);
  
  // Test portfolio tool with platform user
  const server = createMockMCPServer();
  const mockAccessToken = {
    userId: "lux_user_123",
    sessionId: "session_456",
    clientId: "client_789",
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    token: "mock_token_123"
  };

  registerGetUserPortfolioTool({ accessToken: mockAccessToken })(server);

  const [, , , toolHandler] = server.tool.mock.calls[0];
  const result = await toolHandler({
    platform: "realt",
    userId: platformUser.userId,
  });

  console.log(`   Portfolio tool result: ${result.content[0].text.includes("User not found") ? '✓ (correctly fails)' : '✗'}`);
}

async function testProposedSolution(testUsers: TestUser[]) {
  console.log("\n4. Testing Proposed Solution...");
  
  const email = "unified@test.com";
  const password = "password123";
  const name = "Unified Test User";

  // Create platform user
  const platformUser = await createPlatformUser({
    email,
    password,
    name,
    platform: "realt",
    scenario: "empty_portfolio",
  });

  testUsers.push({
    userId: platformUser.userId,
    email: platformUser.email,
    type: 'platform',
    platform: "realt",
  });

  // Implement proposed unified getUserById logic
  const unifiedGetUserById = async (userId: string) => {
    // First try regular user lookup
    const regularUser = await getUserById(userId);
    if (regularUser) {
      return regularUser;
    }

    // Then try platform user lookup
    const platformUserIdMapping = await redis.get(`platform_user_id:${userId}`);
    if (platformUserIdMapping) {
      const [platform, email] = platformUserIdMapping.split(':');
      const platformUser = await getPlatformUserByEmail(platform as PlatformType, email);
      if (platformUser) {
        // Convert to common User format
        return {
          userId: platformUser.userId,
          email: platformUser.email,
          password: "", // Don't expose password
          name: platformUser.name,
          scenario: platformUser.scenario,
          portfolios: platformUser.portfolios,
        };
      }
    }

    return null;
  };

  // Test unified function
  const retrievedUser = await unifiedGetUserById(platformUser.userId);
  console.log(`   Unified getUserById with platform user: ${retrievedUser?.userId === platformUser.userId ? '✓' : '✗'}`);
  
  // Test with regular user
  const luxUser = await createUser({
    email: "luxunified@test.com",
    password: "password123",
    name: "Lux Unified User",
    scenario: "empty_portfolio",
  });
  
  testUsers.push({
    userId: luxUser.userId,
    email: luxUser.email,
    type: 'luxbridge',
  });
  
  const retrievedLuxUser = await unifiedGetUserById(luxUser.userId);
  console.log(`   Unified getUserById with LuxBridge user: ${retrievedLuxUser?.userId === luxUser.userId ? '✓' : '✗'}`);
}

async function testRedisKeyStructure() {
  console.log("\n5. Testing Redis Key Structure...");
  
  const email = "keytest@example.com";
  const password = "password123";
  const name = "Key Test User";

  // Create users
  const luxUser = await createUser({
    email,
    password,
    name,
    scenario: "empty_portfolio",
  });

  const platformUser = await createPlatformUser({
    email,
    password,
    name,
    platform: "masterworks",
    scenario: "empty_portfolio",
  });

  try {
    // Verify Redis keys exist in correct namespaces
    const luxUserKey = `user:${email}`;
    const luxUserIdKey = `user_id:${luxUser.userId}`;
    const platformUserKey = `platform_user:masterworks:${email}`;
    const platformUserIdKey = `platform_user_id:${platformUser.userId}`;

    // Check if keys exist
    const luxUserExists = await redis.exists(luxUserKey);
    const luxUserIdExists = await redis.exists(luxUserIdKey);
    const platformUserExists = await redis.exists(platformUserKey);
    const platformUserIdExists = await redis.exists(platformUserIdKey);

    console.log(`   LuxBridge user key exists: ${luxUserExists === 1 ? '✓' : '✗'}`);
    console.log(`   LuxBridge user ID key exists: ${luxUserIdExists === 1 ? '✓' : '✗'}`);
    console.log(`   Platform user key exists: ${platformUserExists === 1 ? '✓' : '✗'}`);
    console.log(`   Platform user ID key exists: ${platformUserIdExists === 1 ? '✓' : '✗'}`);

    // Check ID mapping values
    const luxUserIdMapping = await redis.get(luxUserIdKey);
    const platformUserIdMapping = await redis.get(platformUserIdKey);

    console.log(`   LuxBridge ID mapping: ${luxUserIdMapping === email ? '✓' : '✗'}`);
    console.log(`   Platform ID mapping: ${platformUserIdMapping === `masterworks:${email}` ? '✓' : '✗'}`);

    console.log(`   Key structure:`);
    console.log(`     LuxBridge user: ${luxUserKey}`);
    console.log(`     LuxBridge user ID: ${luxUserIdKey} -> ${luxUserIdMapping}`);
    console.log(`     Platform user: ${platformUserKey}`);
    console.log(`     Platform user ID: ${platformUserIdKey} -> ${platformUserIdMapping}`);
  } finally {
    // Cleanup
    await redis.del(`user:${luxUser.email}`);
    await redis.del(`user_id:${luxUser.userId}`);
    await redis.del(`platform_user:masterworks:${platformUser.email}`);
    await redis.del(`platform_user_id:${platformUser.userId}`);
  }
}

// Run the test if called directly
if (require.main === module) {
  runPortfolioToolIsolationTest()
    .then(() => testRedisKeyStructure())
    .catch(console.error);
}