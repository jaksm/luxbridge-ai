import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import {
  generateJWT,
  validateJWT,
  extractBearerToken,
} from "@/lib/auth/jwtUtils";
import { PlatformType } from "@/lib/types/platformAsset";
import { mockEnvironmentVariables } from "@/__tests__/utils/testHelpers";

describe("jwtUtils", () => {
  let restoreEnv: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    restoreEnv = mockEnvironmentVariables({ JWT_SECRET: "test_secret" });
  });

  afterEach(() => {
    restoreEnv();
  });

  describe("generateJWT", () => {
    it("should generate JWT with correct payload", () => {
      const jwtSignSpy = vi
        .spyOn(jwt, "sign")
        .mockReturnValue("mock.jwt.token" as any);

      const userId = "test_user_1";
      const platform: PlatformType = "splint_invest";

      const token = generateJWT(userId, platform);

      expect(jwtSignSpy).toHaveBeenCalledWith(
        { userId, platform },
        "test_secret",
        { expiresIn: "24h" },
      );
      expect(token).toBe("mock.jwt.token");
    });

    it("should handle different platforms", () => {
      const jwtSignSpy = vi
        .spyOn(jwt, "sign")
        .mockReturnValue("mock.jwt.token" as any);
      const platforms: PlatformType[] = [
        "splint_invest",
        "masterworks",
        "realt",
      ];

      platforms.forEach((platform) => {
        generateJWT("test_user", platform);

        expect(jwtSignSpy).toHaveBeenCalledWith(
          { userId: "test_user", platform },
          "test_secret",
          { expiresIn: "24h" },
        );
      });
    });
  });

  describe("validateJWT", () => {
    it("should validate correct JWT token", () => {
      const mockPayload = {
        userId: "test_user_1",
        platform: "splint_invest",
        iat: 1640000000,
        exp: 1640086400,
      };

      const jwtVerifySpy = vi
        .spyOn(jwt, "verify")
        .mockReturnValue(mockPayload as any);

      const result = validateJWT("valid.jwt.token");

      expect(jwtVerifySpy).toHaveBeenCalledWith(
        "valid.jwt.token",
        "test_secret",
      );
      expect(result).toEqual(mockPayload);
    });

    it("should return null for invalid JWT token", () => {
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const result = validateJWT("invalid.jwt.token");

      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new jwt.TokenExpiredError("Token expired", new Date());
      });

      const result = validateJWT("expired.jwt.token");

      expect(result).toBeNull();
    });

    it("should return null for malformed token", () => {
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw new jwt.JsonWebTokenError("Malformed token");
      });

      const result = validateJWT("malformed.token");

      expect(result).toBeNull();
    });
  });

  describe("extractBearerToken", () => {
    it("should extract token from valid Bearer header", () => {
      const token = extractBearerToken("Bearer valid.jwt.token");
      expect(token).toBe("valid.jwt.token");
    });

    it("should extract token with spaces", () => {
      const token = extractBearerToken("Bearer  token.with.spaces  ");
      expect(token).toBe(" token.with.spaces  ");
    });

    it("should return null for missing authorization header", () => {
      const token = extractBearerToken(undefined);
      expect(token).toBeNull();
    });

    it("should return null for non-Bearer authorization", () => {
      const token = extractBearerToken("Basic username:password");
      expect(token).toBeNull();
    });

    it("should return null for Bearer without token", () => {
      const token = extractBearerToken("Bearer");
      expect(token).toBeNull();
    });

    it("should return null for Bearer with only space", () => {
      const token = extractBearerToken("Bearer ");
      expect(token).toBeNull();
    });

    it("should handle case sensitivity", () => {
      const token = extractBearerToken("bearer valid.jwt.token");
      expect(token).toBeNull();
    });

    it("should handle malformed headers", () => {
      const testCases = [
        "",
        "Token valid.jwt.token",
        "Bearer",
        "BearerToken",
        "Bear valid.jwt.token",
      ];

      testCases.forEach((header) => {
        const result = extractBearerToken(header);
        expect(result).toBeNull();
      });
    });
  });
});
