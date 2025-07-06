import type { AccessToken } from "../../lib/redis-oauth";

export interface MockUserData {
  userId: string;
  email: string;
  privyUserId: string;
  walletAddress: string;
  clientId: string;
}

export const DEFAULT_TEST_USERS: MockUserData[] = [
  {
    userId: "test-user-1",
    email: "alice@luxbridge.test",
    privyUserId: "privy-alice-123",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account #0
    clientId: "test-client-1",
  },
  {
    userId: "test-user-2", 
    email: "bob@luxbridge.test",
    privyUserId: "privy-bob-456",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
    clientId: "test-client-2",
  },
  {
    userId: "test-user-3",
    email: "charlie@luxbridge.test", 
    privyUserId: "privy-charlie-789",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account #2
    clientId: "test-client-3",
  },
];

export function createMockAccessToken(
  userData: Partial<MockUserData> = {},
  overrides: Partial<AccessToken> = {}
): AccessToken {
  const defaultUser = DEFAULT_TEST_USERS[0];
  const user = { ...defaultUser, ...userData };

  const now = Date.now();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  return {
    token: `mock-access-token-${user.userId}-${now}`,
    expiresAt,
    clientId: user.clientId,
    userId: user.userId,
    sessionId: `mock-session-${user.userId}`,
    userData: {
      email: user.email,
      privyUserId: user.privyUserId,
      walletAddress: user.walletAddress,
    },
    ...overrides,
  };
}

export function createMockAccessTokenForUser(userIndex: number = 0): AccessToken {
  if (userIndex >= DEFAULT_TEST_USERS.length) {
    throw new Error(`User index ${userIndex} out of range. Max: ${DEFAULT_TEST_USERS.length - 1}`);
  }
  
  return createMockAccessToken(DEFAULT_TEST_USERS[userIndex]);
}

export function getAllMockAccessTokens(): AccessToken[] {
  return DEFAULT_TEST_USERS.map((_, index) => createMockAccessTokenForUser(index));
}