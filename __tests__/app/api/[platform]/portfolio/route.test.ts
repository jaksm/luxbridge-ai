import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, OPTIONS } from "@/app/api/[platform]/portfolio/route";
import {
  createMockRequestWithAuth,
  createMockContext,
  expectJSONResponse,
  expectErrorResponse,
} from "@/__tests__/utils/testHelpers";
import {
  mockTokenPayloads,
  mockJWTTokens,
} from "@/__tests__/fixtures/mockTokens";
import { mockUsers } from "@/__tests__/fixtures/mockUsers";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";

vi.mock("@/lib/auth/authCommon");
vi.mock("@/lib/utils/portfolioCalculator");

describe("Platform Portfolio Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return user portfolio with assets", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const { constructUserPortfolio, calculatePortfolioMetrics } =
        await import("@/lib/utils/portfolioCalculator");

      const mockUser = mockUsers["test@example.com"];
      const mockConstructedAssets = [
        {
          ...createMockAsset(),
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
          currentValue: 1000,
          unrealizedGain: 50,
        },
      ];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(mockUser);
      vi.mocked(constructUserPortfolio).mockResolvedValue(
        mockConstructedAssets,
      );
      vi.mocked(calculatePortfolioMetrics).mockReturnValue({
        totalValue: 1000,
        totalGain: 50,
        totalReturn: 5,
        assetCount: 1,
      });

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data).toMatchObject({
        userId: "test_user_1",
        totalValue: 1000,
        currency: "USD",
        assets: mockConstructedAssets,
        platformSummary: {
          totalAssets: 1,
          assetCategories: expect.any(Object),
        },
        lastUpdated: expect.any(String),
      });

      expect(constructUserPortfolio).toHaveBeenCalledWith(
        mockUser.portfolios.splint_invest,
        "splint_invest",
      );
    });

    it("should return empty portfolio for user with no holdings", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const emptyUser = mockUsers["empty@example.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(emptyUser);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data).toMatchObject({
        userId: "empty_user",
        totalValue: 0,
        currency: "USD",
        assets: [],
        platformSummary: {
          totalAssets: 0,
          assetCategories: {},
        },
        lastUpdated: expect.any(String),
      });
    });

    it("should handle demo user empty portfolio", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const demoUser = mockUsers["jaksa.malisic@gmail.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(demoUser);

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.userId).toBe("demo_user");
      expect(data.totalValue).toBe(0);
      expect(data.assets).toEqual([]);
    });

    it("should reject missing authorization", async () => {
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

      const mockUser = mockUsers["test@example.com"];
      vi.mocked(getUserById).mockReturnValue(mockUser);

      const platforms = ["splint_invest", "masterworks", "realt"] as const;

      for (const platform of platforms) {
        const tokenPayload = { ...mockTokenPayloads.valid, platform };
        vi.mocked(authenticateToken).mockReturnValue(tokenPayload);

        const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
        const context = createMockContext({ platform });

        const response = await GET(request, context);
        const data = await expectJSONResponse(response, 200);

        expect(data.userId).toBe("test_user_1");
      }
    });

    it("should calculate asset categories correctly", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const { constructUserPortfolio, calculatePortfolioMetrics } =
        await import("@/lib/utils/portfolioCalculator");

      const mockUser = mockUsers["test@example.com"];
      const mockConstructedAssets = [
        {
          ...createMockAsset({ category: "wine" }),
          sharesOwned: 10,
          acquisitionPrice: 95,
          acquisitionDate: "2024-01-01T00:00:00Z",
          currentValue: 1000,
          unrealizedGain: 50,
        },
        {
          ...createMockAsset({ category: "wine" }),
          sharesOwned: 5,
          acquisitionPrice: 55,
          acquisitionDate: "2024-01-15T00:00:00Z",
          currentValue: 500,
          unrealizedGain: 25,
        },
        {
          ...createMockAsset({ category: "art" }),
          sharesOwned: 2,
          acquisitionPrice: 200,
          acquisitionDate: "2024-01-10T00:00:00Z",
          currentValue: 400,
          unrealizedGain: 0,
        },
      ];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(mockUser);
      vi.mocked(constructUserPortfolio).mockResolvedValue(
        mockConstructedAssets,
      );
      vi.mocked(calculatePortfolioMetrics).mockReturnValue({
        totalValue: 1900,
        totalGain: 75,
        totalReturn: 4.1,
        assetCount: 3,
      });

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      expect(data.platformSummary.assetCategories).toEqual({
        wine: 2,
        art: 1,
      });
      expect(data.platformSummary.totalAssets).toBe(3);
    });

    it("should handle portfolio construction errors", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );
      const { constructUserPortfolio } = await import(
        "@/lib/utils/portfolioCalculator"
      );

      const mockUser = mockUsers["test@example.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(mockUser);
      vi.mocked(constructUserPortfolio).mockRejectedValue(
        new Error("Asset not found"),
      );

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

    it("should include timestamp in response", async () => {
      const { authenticateToken, getUserById } = await import(
        "@/lib/auth/authCommon"
      );

      const emptyUser = mockUsers["empty@example.com"];

      vi.mocked(authenticateToken).mockReturnValue(mockTokenPayloads.valid);
      vi.mocked(getUserById).mockReturnValue(emptyUser);

      const beforeRequest = new Date().toISOString();

      const request = createMockRequestWithAuth({}, mockJWTTokens.valid);
      const context = createMockContext({ platform: "splint_invest" });

      const response = await GET(request, context);
      const data = await expectJSONResponse(response, 200);

      const afterRequest = new Date().toISOString();

      expect(data.lastUpdated).toBeDefined();
      expect(data.lastUpdated).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/,
      );
      expect(new Date(data.lastUpdated).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeRequest).getTime(),
      );
      expect(new Date(data.lastUpdated).getTime()).toBeLessThanOrEqual(
        new Date(afterRequest).getTime(),
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
