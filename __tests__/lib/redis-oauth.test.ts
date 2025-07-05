import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRedisClient } from "../setup";
import {
  generateRandomString,
  generateClientId,
  generateClientSecret,
  generateAuthCode,
  generateAccessToken,
  storeClient,
  getClient,
  storeAuthCode,
  getAuthCode,
  deleteAuthCode,
  storeAccessToken,
  getAccessToken,
  deleteAccessToken,
} from "@/lib/redis-oauth";

describe("String Generators", () => {
  describe("generateRandomString", () => {
    it("should generate string of default length 32", () => {
      const result = generateRandomString();
      expect(result).toHaveLength(32);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("should generate string of specified length", () => {
      const result = generateRandomString(16);
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("should generate different strings on each call", () => {
      const result1 = generateRandomString();
      const result2 = generateRandomString();
      expect(result1).not.toBe(result2);
    });

    it("should handle length 0", () => {
      const result = generateRandomString(0);
      expect(result).toBe("");
    });
  });

  describe("generateClientId", () => {
    it("should generate 16 character string", () => {
      const result = generateClientId();
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe("generateClientSecret", () => {
    it("should generate 64 character string", () => {
      const result = generateClientSecret();
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe("generateAuthCode", () => {
    it("should generate 32 character string", () => {
      const result = generateAuthCode();
      expect(result).toHaveLength(32);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe("generateAccessToken", () => {
    it("should generate 64 character string", () => {
      const result = generateAccessToken();
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });
});

describe("Redis OAuth Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Client Operations", () => {
    const mockClient = {
      id: "client_123",
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      name: "Test Client",
      redirectUris: ["http://localhost:3000/callback"],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    describe("storeClient", () => {
      it("should store client data in Redis", async () => {
        await storeClient(mockClient);

        expect(mockRedisClient.hSet).toHaveBeenCalledWith(
          `oauth:client:${mockClient.clientId}`,
          {
            id: mockClient.id,
            clientId: mockClient.clientId,
            clientSecret: mockClient.clientSecret,
            name: mockClient.name,
            redirectUris: JSON.stringify(mockClient.redirectUris),
            createdAt: mockClient.createdAt,
          },
        );
      });
    });

    describe("getClient", () => {
      it("should retrieve and parse client data", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({
          id: mockClient.id,
          clientId: mockClient.clientId,
          clientSecret: mockClient.clientSecret,
          name: mockClient.name,
          redirectUris: JSON.stringify(mockClient.redirectUris),
          createdAt: mockClient.createdAt,
        });

        const result = await getClient(mockClient.clientId);

        expect(mockRedisClient.hGetAll).toHaveBeenCalledWith(
          `oauth:client:${mockClient.clientId}`,
        );
        expect(result).toEqual(mockClient);
      });

      it("should return null if client not found", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({});

        const result = await getClient("non_existent_client");

        expect(result).toBeNull();
      });
    });
  });

  describe("Auth Code Operations", () => {
    const mockAuthCode = {
      code: "test_auth_code",
      expiresAt: "2024-01-01T01:00:00.000Z",
      clientId: "test_client_id",
      userId: "test_user_id",
      redirectUri: "http://localhost:3000/callback",
      codeChallenge: "test_challenge",
      codeChallengeMethod: "S256",
    };

    describe("storeAuthCode", () => {
      it("should store auth code with expiration", async () => {
        await storeAuthCode(mockAuthCode);

        expect(mockRedisClient.hSet).toHaveBeenCalledWith(
          `oauth:authcode:${mockAuthCode.code}`,
          {
            code: mockAuthCode.code,
            expiresAt: mockAuthCode.expiresAt,
            clientId: mockAuthCode.clientId,
            userId: mockAuthCode.userId,
            redirectUri: mockAuthCode.redirectUri,
            codeChallenge: mockAuthCode.codeChallenge,
            codeChallengeMethod: mockAuthCode.codeChallengeMethod,
          },
        );
        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          `oauth:authcode:${mockAuthCode.code}`,
          600,
        );
      });

      it("should handle optional PKCE fields", async () => {
        const authCodeWithoutPKCE = {
          ...mockAuthCode,
          codeChallenge: undefined,
          codeChallengeMethod: undefined,
        };

        await storeAuthCode(authCodeWithoutPKCE);

        expect(mockRedisClient.hSet).toHaveBeenCalledWith(
          `oauth:authcode:${mockAuthCode.code}`,
          expect.objectContaining({
            codeChallenge: "",
            codeChallengeMethod: "",
          }),
        );
      });
    });

    describe("getAuthCode", () => {
      it("should retrieve and parse auth code data", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({
          code: mockAuthCode.code,
          expiresAt: mockAuthCode.expiresAt,
          clientId: mockAuthCode.clientId,
          userId: mockAuthCode.userId,
          redirectUri: mockAuthCode.redirectUri,
          codeChallenge: mockAuthCode.codeChallenge,
          codeChallengeMethod: mockAuthCode.codeChallengeMethod,
        });

        const result = await getAuthCode(mockAuthCode.code);

        expect(result).toEqual(mockAuthCode);
      });

      it("should return null if auth code not found", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({});

        const result = await getAuthCode("non_existent_code");

        expect(result).toBeNull();
      });

      it("should handle empty PKCE fields", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({
          code: mockAuthCode.code,
          expiresAt: mockAuthCode.expiresAt,
          clientId: mockAuthCode.clientId,
          userId: mockAuthCode.userId,
          redirectUri: mockAuthCode.redirectUri,
          codeChallenge: "",
          codeChallengeMethod: "",
        });

        const result = await getAuthCode(mockAuthCode.code);

        expect(result).toBeDefined();
        expect(result!.codeChallenge).toBeUndefined();
        expect(result!.codeChallengeMethod).toBeUndefined();
      });
    });

    describe("deleteAuthCode", () => {
      it("should delete auth code from Redis", async () => {
        await deleteAuthCode(mockAuthCode.code);

        expect(mockRedisClient.del).toHaveBeenCalledWith(
          `oauth:authcode:${mockAuthCode.code}`,
        );
      });
    });
  });

  describe("Access Token Operations", () => {
    const mockAccessToken = {
      token: "test_access_token",
      expiresAt: "2024-01-01T01:00:00.000Z",
      clientId: "test_client_id",
      userId: "test_user_id",
    };

    describe("storeAccessToken", () => {
      it("should store access token with expiration", async () => {
        await storeAccessToken(mockAccessToken);

        expect(mockRedisClient.hSet).toHaveBeenCalledWith(
          `oauth:token:${mockAccessToken.token}`,
          mockAccessToken,
        );
        expect(mockRedisClient.expire).toHaveBeenCalledWith(
          `oauth:token:${mockAccessToken.token}`,
          2592000,
        );
      });
    });

    describe("getAccessToken", () => {
      it("should retrieve access token data", async () => {
        mockRedisClient.hGetAll.mockResolvedValue(mockAccessToken);

        const result = await getAccessToken(mockAccessToken.token);

        expect(result).toEqual(mockAccessToken);
      });

      it("should return null if access token not found", async () => {
        mockRedisClient.hGetAll.mockResolvedValue({});

        const result = await getAccessToken("non_existent_token");

        expect(result).toBeNull();
      });
    });

    describe("deleteAccessToken", () => {
      it("should delete access token from Redis", async () => {
        await deleteAccessToken(mockAccessToken.token);

        expect(mockRedisClient.del).toHaveBeenCalledWith(
          `oauth:token:${mockAccessToken.token}`,
        );
      });
    });
  });
});
