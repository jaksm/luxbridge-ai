import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, OPTIONS } from "@/app/api/[platform]/auth/me/route";
import {
  createMockRequestWithAuth,
  createMockContext,
  expectJSONResponse,
  expectErrorResponse,
} from "@/__tests__/utils/testHelpers";
import { createMockUserInfo } from "@/__tests__/fixtures/mockUsers";
import {
  mockTokenPayloads,
  mockJWTTokens,
} from "@/__tests__/fixtures/mockTokens";

vi.mock("@/lib/auth/authCommon");

describe("Platform Auth Me Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return user info with valid token", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue({
        userId: "test_user_1",
        email: "test@example.com",
        password: "password123",
        name: "Test User",
        scenario: "diversified",
        portfolios: { splint_invest: [], masterworks: [], realt: [] },
      });

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data).toEqual(createMockUserInfo("splint_invest"));
      expect(authenticateToken).toHaveBeenCalledWith(
        `Bearer ${mockJWTTokens.valid}`,
      );
      expect(getUserById).toHaveBeenCalledWith("test_user_1");
    });

    it("should reject missing authorization header", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth();
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should reject invalid token", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth({}, mockJWTTokens.invalid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should reject platform mismatch", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(
        mockTokenPayloads.platform_mismatch,
      );

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        403,
        "platform_mismatch",
        "Token platform does not match requested platform",
      );
    });

    it("should handle user not found", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(undefined);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        404,
        "user_not_found",
        "User not found",
      );
    });

    it("should validate platform parameter", async () => {
      const invalidPlatforms = ["invalid_platform", "", "blockchain"];

      for (const platform of invalidPlatforms) {
        const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
        const context = createMockContext({ platform });

        const response = await GET(request, context);

        await expectErrorResponse(
          response,
          400,
          "invalid_platform",
          "Invalid platform specified",
        );
      }
    });

    it("should work for all valid platforms", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      vi.mocked(getUserById).mockReturnValue({
        userId: "test_user_1",
        email: "test@example.com",
        password: "password123",
        name: "Test User",
        scenario: "diversified",
        portfolios: { splint_invest: [], masterworks: [], realt: [] },
      });

      const platforms = ["splint_invest", "masterworks", "realt"];

      for (const platform of platforms) {
        const tokenPayload = {
          ...mockTokenPayloads.valid,
          platform: platform as any,
        };
        vi.mocked(authenticateToken).mockReturnValue(tokenPayload);

        const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
        const context = createMockContext({ platform });

        const response = await GET(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data.platform).toBe(platform);
      }
    });

    it("should handle expired token", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      // In real implementation, expired tokens would return null from authenticateToken
      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth({}, mockJWTTokens.expired);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should handle malformed authorization header", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockReturnValue(null);

      const request = createMockRequestWithAuth({}, "malformed_header");
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        401,
        "unauthorized",
        "Invalid or missing token",
      );
    });

    it("should handle authentication service errors", async () => {
      const { authenticateToken } = await import("@/lib/auth/authCommon");

      vi.mocked(authenticateToken).mockImplementation(() => {
        throw new Error("Auth service error");
      });

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);

      await expectErrorResponse(
        response,
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    });
  });

  describe("OPTIONS", () => {
    it("should return correct CORS headers", async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
        "GET, OPTIONS",
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
    });
  });
});
