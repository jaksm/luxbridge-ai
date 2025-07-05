import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST, OPTIONS } from "@/app/api/[platform]/auth/login/route";
import {
  createMockRequest,
  createMockContext,
  expectJSONResponse,
  expectErrorResponse,
} from "@/__tests__/utils/testHelpers";
import {
  mockLoginRequests,
  createMockLoginResponse,
} from "@/__tests__/fixtures/mockUsers";
// import { mockAPIResponses } from "@/__tests__/fixtures/mockTokens";

vi.mock("@/lib/auth/authCommon");
vi.mock("@/lib/auth/jwtUtils");

describe("Platform Auth Login Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST", () => {
    it("should login successfully with valid credentials", async () => {
      const { validateCredentials } = await import("@/lib/auth/authCommon");
      const { generateJWT } = await import("@/lib/auth/jwtUtils");

      vi.mocked(validateCredentials).mockResolvedValue({
        success: true,
        user: {
          userId: "test_user_1",
          email: "test@example.com",
          password: "password123",
          name: "Test User",
          scenario: "diversified",
          portfolios: { splint_invest: [], masterworks: [], realt: [] },
        },
      });
      vi.mocked(generateJWT).mockReturnValue("mock.jwt.token");

      const request = createMockRequest(mockLoginRequests.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await POST(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data).toEqual(createMockLoginResponse("splint_invest"));
      expect(validateCredentials).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(generateJWT).toHaveBeenCalledWith("test_user_1", "splint_invest");
    });

    it("should reject invalid credentials", async () => {
      const { validateCredentials } = await import("@/lib/auth/authCommon");

      vi.mocked(validateCredentials).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const request = createMockRequest(mockLoginRequests.invalid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await POST(request, context);

      await expectErrorResponse(
        response,
        401,
        "invalid_credentials",
        "Invalid email or password",
      );
    });

    it("should validate required fields", async () => {
      const testCases = [
        { body: mockLoginRequests.missing_email, field: "email" },
        { body: mockLoginRequests.missing_password, field: "password" },
        { body: {}, field: "both" },
      ];

      for (const { body } of testCases) {
        const request = createMockRequest(body);
        const context = createMockContext({ platform: "splint_invest" });

        const response = await POST(request, context);

        await expectErrorResponse(
          response,
          400,
          "missing_credentials",
          "Email and password are required",
        );
      }
    });

    it("should validate platform parameter", async () => {
      const invalidPlatforms = ["invalid_platform", "", "blockchain", "crypto"];

      for (const platform of invalidPlatforms) {
        const request = createMockRequest(mockLoginRequests.valid);
        const context = createMockContext({ platform });

        const response = await POST(request, context);

        await expectErrorResponse(
          response,
          400,
          "invalid_platform",
          "Invalid platform specified",
        );
      }
    });

    it("should work for all valid platforms", async () => {
      const { validateCredentials } = await import("@/lib/auth/authCommon");
      const { generateJWT } = await import("@/lib/auth/jwtUtils");

      vi.mocked(validateCredentials).mockResolvedValue({
        success: true,
        user: {
          userId: "test_user_1",
          email: "test@example.com",
          password: "password123",
          name: "Test User",
          scenario: "diversified",
          portfolios: { splint_invest: [], masterworks: [], realt: [] },
        },
      });
      vi.mocked(generateJWT).mockReturnValue("mock.jwt.token");

      const platforms = ["splint_invest", "masterworks", "realt"];

      for (const platform of platforms) {
        const request = createMockRequest(mockLoginRequests.valid);
        const context = createMockContext({ platform });

        const response = await POST(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data.platform).toBe(platform);
        expect(generateJWT).toHaveBeenCalledWith("test_user_1", platform);
      }
    });

    it("should handle malformed JSON", async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as any;
      const context = createMockContext({ platform: "splint_invest" });

      const response = await POST(request, context);

      await expectErrorResponse(
        response,
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    });

    it("should handle authentication service errors", async () => {
      const { validateCredentials } = await import("@/lib/auth/authCommon");

      vi.mocked(validateCredentials).mockRejectedValue(
        new Error("Database error"),
      );

      const request = createMockRequest(mockLoginRequests.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await POST(request, context);

      await expectErrorResponse(
        response,
        500,
        "internal_error",
        "An unexpected error occurred",
      );
    });

    it("should handle JWT generation errors", async () => {
      const { validateCredentials } = await import("@/lib/auth/authCommon");
      const { generateJWT } = await import("@/lib/auth/jwtUtils");

      vi.mocked(validateCredentials).mockResolvedValue({
        success: true,
        user: {
          userId: "test_user_1",
          email: "test@example.com",
          password: "password123",
          name: "Test User",
          scenario: "diversified",
          portfolios: { splint_invest: [], masterworks: [], realt: [] },
        },
      });
      vi.mocked(generateJWT).mockImplementation(() => {
        throw new Error("JWT error");
      });

      const request = createMockRequest(mockLoginRequests.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await POST(request, context);

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
        "POST, OPTIONS",
      );
      expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
        "Content-Type, Authorization",
      );
    });
  });
});
