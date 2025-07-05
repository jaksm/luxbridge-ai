import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockUsers } from "@/__tests__/fixtures/mockUsers";
import {
  mockTokenPayloads,
  mockAuthHeaders,
} from "@/__tests__/fixtures/mockTokens";
import * as jwtUtils from "@/lib/auth/jwtUtils";

vi.mock("@/lib/auth/redis-users", () => ({
  validateCredentials: vi.fn(),
  getUserById: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("@/lib/auth/jwtUtils", () => ({
  extractBearerToken: vi.fn(),
  validateJWT: vi.fn(),
}));

import {
  validateCredentials,
  authenticateToken,
  getUserById,
} from "@/lib/auth/authCommon";
import * as redisUsers from "@/lib/auth/redis-users";

describe("authCommon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateCredentials", () => {
    it("should validate correct credentials", async () => {
      const mockRedisUser = {
        ...mockUsers["test@example.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: true,
        user: mockRedisUser,
      });

      const result = await validateCredentials(
        "test@example.com",
        "password123",
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        ...mockUsers["test@example.com"],
        password: "", // Password is stripped for security
      });
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid email", async () => {
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const result = await validateCredentials(
        "nonexistent@example.com",
        "password123",
      );

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe("Invalid credentials");
    });

    it("should reject invalid password", async () => {
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const result = await validateCredentials(
        "test@example.com",
        "wrongpassword",
      );

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe("Invalid credentials");
    });

    it("should handle empty email", async () => {
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const result = await validateCredentials("", "password123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });

    it("should handle empty password", async () => {
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const result = await validateCredentials("test@example.com", "");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials");
    });

    it("should validate demo user credentials", async () => {
      const mockRedisUser = {
        ...mockUsers["jaksa.malisic@gmail.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: true,
        user: mockRedisUser,
      });

      const result = await validateCredentials(
        "jaksa.malisic@gmail.com",
        "demo123",
      );

      expect(result.success).toBe(true);
      expect(result.user?.userId).toBe("demo_user");
      expect(result.user?.scenario).toBe("empty_portfolio");
      expect(result.user?.password).toBe(""); // Password is stripped for security
    });

    it("should validate empty portfolio user", async () => {
      const mockRedisUser = {
        ...mockUsers["empty@example.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.validateCredentials).mockResolvedValue({
        success: true,
        user: mockRedisUser,
      });

      const result = await validateCredentials(
        "empty@example.com",
        "password123",
      );

      expect(result.success).toBe(true);
      expect(result.user?.userId).toBe("empty_user");
      expect(result.user?.password).toBe(""); // Password is stripped for security
      expect(result.user?.portfolios.splint_invest).toEqual([]);
      expect(result.user?.portfolios.masterworks).toEqual([]);
      expect(result.user?.portfolios.realt).toEqual([]);
    });
  });

  describe("authenticateToken", () => {
    it("should authenticate valid Bearer token", () => {
      const mockPayload = mockTokenPayloads.valid;
      vi.spyOn(jwtUtils, "extractBearerToken").mockReturnValue(
        "valid.jwt.token",
      );
      vi.spyOn(jwtUtils, "validateJWT").mockReturnValue(mockPayload);

      const result = authenticateToken(mockAuthHeaders.valid);

      expect(result).toEqual(mockPayload);
      expect(jwtUtils.extractBearerToken).toHaveBeenCalledWith(
        mockAuthHeaders.valid,
      );
      expect(jwtUtils.validateJWT).toHaveBeenCalledWith("valid.jwt.token");
    });

    it("should return null for missing authorization header", () => {
      vi.mocked(jwtUtils.extractBearerToken).mockReturnValue(null);
      vi.mocked(jwtUtils.validateJWT).mockReturnValue(null);

      const result = authenticateToken(undefined);

      expect(result).toBeNull();
    });

    it("should return null for malformed authorization header", () => {
      vi.spyOn(jwtUtils, "extractBearerToken").mockReturnValue(null);

      const result = authenticateToken("InvalidHeader");

      expect(result).toBeNull();
      expect(jwtUtils.extractBearerToken).toHaveBeenCalledWith("InvalidHeader");
    });

    it("should return null for invalid JWT token", () => {
      vi.spyOn(jwtUtils, "extractBearerToken").mockReturnValue("invalid.token");
      vi.spyOn(jwtUtils, "validateJWT").mockReturnValue(null);

      const result = authenticateToken(mockAuthHeaders.invalid);

      expect(result).toBeNull();
      expect(jwtUtils.validateJWT).toHaveBeenCalledWith("invalid.token");
    });

    it("should return null for expired token", () => {
      vi.spyOn(jwtUtils, "extractBearerToken").mockReturnValue("expired.token");
      vi.spyOn(jwtUtils, "validateJWT").mockReturnValue(
        mockTokenPayloads.expired,
      );

      const result = authenticateToken(mockAuthHeaders.expired);

      expect(result).toEqual(mockTokenPayloads.expired);
    });

    it("should handle different platforms in token", () => {
      const platforms = ["splint_invest", "masterworks", "realt"] as const;

      platforms.forEach((platform) => {
        const mockPayload = { ...mockTokenPayloads.valid, platform };
        vi.spyOn(jwtUtils, "extractBearerToken").mockReturnValue("valid.token");
        vi.spyOn(jwtUtils, "validateJWT").mockReturnValue(mockPayload);

        const result = authenticateToken("Bearer valid.token");

        expect(result?.platform).toBe(platform);
      });
    });
  });

  describe("getUserById", () => {
    it("should return user for valid user ID", async () => {
      const mockRedisUser = {
        ...mockUsers["test@example.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.getUserById).mockResolvedValue(mockRedisUser);

      const result = await getUserById("test_user_1");

      expect(result).toEqual({
        ...mockUsers["test@example.com"],
        password: "", // Password is stripped for security
      });
    });

    it("should return user for demo user ID", async () => {
      const mockRedisUser = {
        ...mockUsers["jaksa.malisic@gmail.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.getUserById).mockResolvedValue(mockRedisUser);

      const result = await getUserById("demo_user");

      expect(result).toEqual({
        ...mockUsers["jaksa.malisic@gmail.com"],
        password: "", // Password is stripped for security
      });
    });

    it("should return user for empty user ID", async () => {
      const mockRedisUser = {
        ...mockUsers["empty@example.com"],
        passwordHash: "hashedpassword",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      };
      vi.mocked(redisUsers.getUserById).mockResolvedValue(mockRedisUser);

      const result = await getUserById("empty_user");

      expect(result).toEqual({
        ...mockUsers["empty@example.com"],
        password: "", // Password is stripped for security
      });
    });

    it("should return undefined for nonexistent user ID", async () => {
      vi.mocked(redisUsers.getUserById).mockResolvedValue(null);

      const result = await getUserById("nonexistent_user");

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty user ID", async () => {
      vi.mocked(redisUsers.getUserById).mockResolvedValue(null);

      const result = await getUserById("");

      expect(result).toBeUndefined();
    });

    it("should handle special characters in user ID", async () => {
      vi.mocked(redisUsers.getUserById).mockResolvedValue(null);

      const result = await getUserById("user@with#special$chars");

      expect(result).toBeUndefined();
    });

    it("should be case sensitive", async () => {
      vi.mocked(redisUsers.getUserById).mockResolvedValue(null);

      const result = await getUserById("TEST_USER_1");

      expect(result).toBeUndefined();
    });
  });
});
