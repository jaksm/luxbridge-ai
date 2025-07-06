import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createAuthSession,
  getAuthSession,
  deleteAuthSession,
  extendSession,
  updateSessionPlatformLink,
  removeSessionPlatformLink,
  getUserActiveSessions,
  getUserConnectedPlatforms,
  getActiveUserSession,
  storeLuxBridgeUser,
  getLuxBridgeUser,
  updateLuxBridgeUserActivity,
  cleanupExpiredSessions,
} from "@/lib/auth/session-manager";
import {
  AuthSession,
  PlatformLink,
  LuxBridgeUser,
} from "@/lib/types/luxbridge-auth";
import { PlatformType } from "@/lib/types/platformAsset";
import { mockEnvironmentVariables } from "@/__tests__/utils/testHelpers";

vi.mock("@/lib/redis", () => ({
  default: {
    setEx: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    set: vi.fn(),
    keys: vi.fn(),
    isReady: true,
    connect: vi.fn(),
  },
  ensureConnected: vi.fn(),
}));

describe("Session Manager", () => {
  let mockRedis: any;
  let redis: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEnvironmentVariables();

    mockRedis = vi.mocked(await import("@/lib/redis"));
    redis = mockRedis.default;
  });

  describe("createAuthSession", () => {
    it("should create new auth session", async () => {
      const luxUserId = "lux_user_123";
      const privyToken = "privy_token_456";

      const sessionId = await createAuthSession(luxUserId, privyToken);

      expect(sessionId).toMatch(/^lux_session_\d+_[a-z0-9]+$/);
      expect(mockRedis.ensureConnected).toHaveBeenCalled();
      expect(redis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        24 * 60 * 60, // 24 hours
        expect.stringContaining(luxUserId),
      );
    });

    it("should initialize session with empty platform links", async () => {
      const luxUserId = "lux_user_123";
      const privyToken = "privy_token_456";

      vi.mocked(redis.setEx).mockImplementation((key, ttl, value) => {
        const session = JSON.parse(value);
        expect(session.platforms).toEqual({
          splint_invest: null,
          masterworks: null,
          realt: null,
        });
        return Promise.resolve("OK");
      });

      await createAuthSession(luxUserId, privyToken);
    });

    it("should add session to user session list", async () => {
      const luxUserId = "lux_user_123";
      const privyToken = "privy_token_456";

      // Mock existing sessions
      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify(["existing_session"]),
      );

      await createAuthSession(luxUserId, privyToken);

      expect(redis.get).toHaveBeenCalledWith(`user_sessions:${luxUserId}`);
      expect(redis.setEx).toHaveBeenCalledWith(
        `user_sessions:${luxUserId}`,
        24 * 60 * 60,
        expect.stringContaining("existing_session"),
      );
    });
  });

  describe("getAuthSession", () => {
    it("should retrieve valid session", async () => {
      const sessionId = "test_session_123";
      const mockSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      const result = await getAuthSession(sessionId);

      expect(result).toEqual(mockSession);
      expect(mockRedis.ensureConnected).toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it("should return null for non-existent session", async () => {
      const sessionId = "nonexistent_session";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getAuthSession(sessionId);

      expect(result).toBeNull();
    });

    it("should delete and return null for expired session", async () => {
      const sessionId = "expired_session";
      const expiredSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(expiredSession));

      const result = await getAuthSession(sessionId);

      expect(result).toBeNull();
      expect(redis.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });

    it("should handle Redis errors gracefully", async () => {
      const sessionId = "test_session";

      vi.mocked(redis.get).mockRejectedValue(new Error("Redis error"));

      const result = await getAuthSession(sessionId);

      expect(result).toBeNull();
    });
  });

  describe("deleteAuthSession", () => {
    it("should delete session and remove from user list", async () => {
      const sessionId = "test_session_123";
      const mockSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      await deleteAuthSession(sessionId);

      expect(redis.del).toHaveBeenCalledWith(`session:${sessionId}`);
      expect(redis.get).toHaveBeenCalledWith(
        `user_sessions:${mockSession.luxUserId}`,
      );
    });

    it("should handle non-existent session gracefully", async () => {
      const sessionId = "nonexistent_session";

      vi.mocked(redis.get).mockResolvedValue(null);

      await deleteAuthSession(sessionId);

      expect(redis.del).toHaveBeenCalledWith(`session:${sessionId}`);
    });
  });

  describe("extendSession", () => {
    it("should extend session expiration", async () => {
      const sessionId = "test_session_123";
      const mockSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      await extendSession(sessionId);

      expect(redis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        24 * 60 * 60,
        expect.stringContaining(sessionId),
      );
    });

    it("should handle non-existent session", async () => {
      const sessionId = "nonexistent_session";

      vi.mocked(redis.get).mockResolvedValue(null);

      await extendSession(sessionId);

      expect(redis.setEx).not.toHaveBeenCalled();
    });
  });

  describe("updateSessionPlatformLink", () => {
    it("should update platform link in session", async () => {
      const sessionId = "test_session_123";
      const platform: PlatformType = "splint_invest";
      const mockSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const platformLink: PlatformLink = {
        platform,
        luxUserId: "lux_user_123",
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      await updateSessionPlatformLink(sessionId, platform, platformLink);

      expect(redis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        expect.any(Number),
        expect.stringContaining('"splint_invest"'),
      );
    });

    it("should throw error for non-existent session", async () => {
      const sessionId = "nonexistent_session";
      const platform: PlatformType = "splint_invest";
      const platformLink: PlatformLink = {
        platform,
        luxUserId: "lux_user_123",
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      vi.mocked(redis.get).mockResolvedValue(null);

      await expect(
        updateSessionPlatformLink(sessionId, platform, platformLink),
      ).rejects.toThrow("Session not found");
    });
  });

  describe("removeSessionPlatformLink", () => {
    it("should remove platform link from session", async () => {
      const sessionId = "test_session_123";
      const platform: PlatformType = "splint_invest";
      const mockSession: AuthSession = {
        sessionId,
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: {
            platform,
            luxUserId: "lux_user_123",
            platformUserId: "platform_user_456",
            email: "test@example.com",
            name: "Test User",
            accessToken: "access_token_789",
            tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
            linkedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            status: "active",
          },
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      await removeSessionPlatformLink(sessionId, platform);

      expect(redis.setEx).toHaveBeenCalledWith(
        `session:${sessionId}`,
        expect.any(Number),
        expect.stringContaining('"splint_invest":null'),
      );
    });

    it("should handle non-existent session gracefully", async () => {
      const sessionId = "nonexistent_session";
      const platform: PlatformType = "splint_invest";

      vi.mocked(redis.get).mockResolvedValue(null);

      await removeSessionPlatformLink(sessionId, platform);

      expect(redis.setEx).not.toHaveBeenCalled();
    });
  });

  describe("getUserActiveSessions", () => {
    it("should return active sessions for user", async () => {
      const luxUserId = "lux_user_123";
      const sessionIds = ["session_1", "session_2", "session_3"];
      const mockSession: AuthSession = {
        sessionId: "session_1",
        luxUserId,
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(sessionIds)) // user_sessions lookup
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // session_1 lookup
        .mockResolvedValueOnce(
          JSON.stringify({ ...mockSession, sessionId: "session_2" }),
        ) // session_2 lookup
        .mockResolvedValueOnce(null); // session_3 lookup (expired/deleted)

      const result = await getUserActiveSessions(luxUserId);

      expect(result).toEqual(["session_1", "session_2"]);
      expect(redis.get).toHaveBeenCalledWith(`user_sessions:${luxUserId}`);
    });

    it("should return empty array for user with no sessions", async () => {
      const luxUserId = "lux_user_123";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getUserActiveSessions(luxUserId);

      expect(result).toEqual([]);
    });

    it("should clean up expired sessions", async () => {
      const luxUserId = "lux_user_123";
      const sessionIds = ["session_1", "session_2"];

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(sessionIds)) // user_sessions lookup
        .mockResolvedValueOnce(null) // session_1 lookup (expired)
        .mockResolvedValueOnce(null); // session_2 lookup (expired)

      const result = await getUserActiveSessions(luxUserId);

      expect(result).toEqual([]);
      expect(redis.del).toHaveBeenCalledWith(`user_sessions:${luxUserId}`);
    });
  });

  describe("getUserConnectedPlatforms", () => {
    it("should return platforms from specific session", async () => {
      const userId = "lux_user_123";
      const sessionId = "test_session_123";
      const mockPlatformLink: PlatformLink = {
        platform: "splint_invest",
        luxUserId: userId,
        platformUserId: "platform_user_456",
        email: "test@example.com",
        name: "Test User",
        accessToken: "access_token_789",
        tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        linkedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      };

      const mockSession: AuthSession = {
        sessionId,
        luxUserId: userId,
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: mockPlatformLink,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockSession));

      const result = await getUserConnectedPlatforms(userId, sessionId);

      expect(result).toEqual({
        splint_invest: mockPlatformLink,
        masterworks: null,
        realt: null,
      });
    });

    it("should return platforms from most recent session when sessionId not provided", async () => {
      const userId = "lux_user_123";
      const sessionIds = ["session_1", "session_2"];
      const mockSession: AuthSession = {
        sessionId: "session_1",
        luxUserId: userId,
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(sessionIds)) // user_sessions lookup
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // session_1 lookup
        .mockResolvedValueOnce(JSON.stringify(mockSession)); // getAuthSession lookup

      const result = await getUserConnectedPlatforms(userId);

      expect(result).toEqual({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });
    });

    it("should return empty platforms for user with no sessions", async () => {
      const userId = "lux_user_123";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getUserConnectedPlatforms(userId);

      expect(result).toEqual({
        splint_invest: null,
        masterworks: null,
        realt: null,
      });
    });
  });

  describe("getActiveUserSession", () => {
    it("should return most recent active session", async () => {
      const userId = "lux_user_123";
      const sessionIds = ["session_1", "session_2"];
      const mockSession: AuthSession = {
        sessionId: "session_1",
        luxUserId: userId,
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      vi.mocked(redis.get)
        .mockResolvedValueOnce(JSON.stringify(sessionIds)) // user_sessions lookup
        .mockResolvedValueOnce(JSON.stringify(mockSession)) // session validation
        .mockResolvedValueOnce(JSON.stringify(mockSession)); // getAuthSession lookup

      const result = await getActiveUserSession(userId);

      expect(result).toEqual(mockSession);
    });

    it("should return null for user with no active sessions", async () => {
      const userId = "lux_user_123";

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await getActiveUserSession(userId);

      expect(result).toBeNull();
    });
  });

  describe("LuxBridge User Management", () => {
    describe("storeLuxBridgeUser", () => {
      it("should store LuxBridge user", async () => {
        const user: LuxBridgeUser = {
          privyId: "privy_123",
          email: "test@example.com",
          name: "Test User",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        await storeLuxBridgeUser(user);

        expect(redis.set).toHaveBeenCalledWith(
          `lux_user:${user.privyId}`,
          JSON.stringify(user),
        );
      });

      it("should handle Redis errors", async () => {
        const user: LuxBridgeUser = {
          privyId: "privy_123",
          email: "test@example.com",
          name: "Test User",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        vi.mocked(redis.set).mockRejectedValue(new Error("Redis error"));

        await expect(storeLuxBridgeUser(user)).rejects.toThrow("Redis error");
      });
    });

    describe("getLuxBridgeUser", () => {
      it("should retrieve LuxBridge user", async () => {
        const privyId = "privy_123";
        const user: LuxBridgeUser = {
          privyId,
          email: "test@example.com",
          name: "Test User",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };

        vi.mocked(redis.get).mockResolvedValue(JSON.stringify(user));

        const result = await getLuxBridgeUser(privyId);

        expect(result).toEqual(user);
        expect(redis.get).toHaveBeenCalledWith(`lux_user:${privyId}`);
      });

      it("should return null for non-existent user", async () => {
        const privyId = "nonexistent_privy";

        vi.mocked(redis.get).mockResolvedValue(null);

        const result = await getLuxBridgeUser(privyId);

        expect(result).toBeNull();
      });
    });

    describe("updateLuxBridgeUserActivity", () => {
      it("should update user activity timestamp", async () => {
        const privyId = "privy_123";
        const user: LuxBridgeUser = {
          privyId,
          email: "test@example.com",
          name: "Test User",
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        };

        vi.mocked(redis.get).mockResolvedValue(JSON.stringify(user));

        await updateLuxBridgeUserActivity(privyId);

        expect(redis.set).toHaveBeenCalledWith(
          `lux_user:${privyId}`,
          expect.stringContaining('"lastActiveAt"'),
        );
      });

      it("should handle non-existent user", async () => {
        const privyId = "nonexistent_privy";

        vi.mocked(redis.get).mockResolvedValue(null);

        await updateLuxBridgeUserActivity(privyId);

        expect(redis.set).not.toHaveBeenCalled();
      });
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should cleanup expired sessions", async () => {
      const expiredSession: AuthSession = {
        sessionId: "expired_session",
        luxUserId: "lux_user_123",
        privyToken: "privy_token_456",
        platforms: {
          splint_invest: null,
          masterworks: null,
          realt: null,
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      vi.mocked(redis.keys).mockResolvedValue(["session:expired_session"]);
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(expiredSession));

      await cleanupExpiredSessions();

      expect(redis.keys).toHaveBeenCalledWith("session:*");
      expect(redis.del).toHaveBeenCalledWith("session:expired_session");
    });

    it("should handle cleanup errors gracefully", async () => {
      vi.mocked(redis.keys).mockRejectedValue(new Error("Redis error"));

      await cleanupExpiredSessions();

      // Should not throw error
    });
  });
});
