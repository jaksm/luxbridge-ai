import { vi, expect } from "vitest";
import { NextRequest } from "next/server";
import { PlatformType } from "@/lib/types/platformAsset";
import { createMockBearerToken } from "@/__tests__/fixtures/mockTokens";

export const createMockRequest = (
  body?: any,
  headers?: Record<string, string>,
): NextRequest => {
  const mockHeaders = new Headers(headers || {});

  return {
    json: vi.fn().mockResolvedValue(body || {}),
    headers: {
      get: vi.fn((key: string) => mockHeaders.get(key)),
    },
    url: "http://localhost:3000/test",
    method: "GET",
  } as unknown as NextRequest;
};

export const createMockRequestWithAuth = (
  body?: any,
  authToken?: string,
  additionalHeaders?: Record<string, string>,
): NextRequest => {
  const headers: Record<string, string> = {
    ...(additionalHeaders || {}),
  };
  if (authToken) {
    headers.authorization = createMockBearerToken(authToken);
  }

  return createMockRequest(body, headers);
};

export const createMockRequestWithPlatform = (
  platform: PlatformType,
  body?: any,
  authToken?: string,
): NextRequest => {
  const headers: Record<string, string> = authToken
    ? { authorization: createMockBearerToken(authToken) }
    : {};
  const url = `http://localhost:3000/api/${platform}/test`;

  const request = createMockRequest(body, headers);
  Object.defineProperty(request, "url", { value: url });

  return request;
};

export const createMockContext = <T extends Record<string, any>>(
  params: T,
) => ({
  params: Promise.resolve(params),
});

export const expectJSONResponse = async (
  response: Response,
  expectedStatus: number,
  expectedData?: any,
) => {
  expect(response.status).toBe(expectedStatus);

  if (expectedData) {
    const data = await response.json();
    expect(data).toEqual(expectedData);
    return data;
  }

  return await response.json();
};

export const expectErrorResponse = async (
  response: Response,
  expectedStatus: number,
  expectedError: string,
  expectedMessage?: string,
) => {
  const data = await expectJSONResponse(response, expectedStatus);
  expect(data.error).toBe(expectedError);

  if (expectedMessage) {
    expect(data.message).toBe(expectedMessage);
  }

  return data;
};

export const mockEnvironmentVariables = (
  overrides: Record<string, string> = {},
) => {
  const originalEnv = process.env;

  process.env = {
    ...originalEnv,
    JWT_SECRET: "test_secret",
    PINECONE_API_KEY: "test_pinecone_key",
    PINECONE_INDEX_NAME: "test-index",
    OPENAI_API_KEY: "test_openai_key",
    REDIS_URL: "redis://localhost:6379",
    ...overrides,
  };

  return () => {
    process.env = originalEnv;
  };
};

export const setupTestMocks = () => {
  const mockConsoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

  return {
    mockConsoleError,
    mockConsoleLog,
    cleanup: () => {
      mockConsoleError.mockRestore();
      mockConsoleLog.mockRestore();
    },
  };
};

export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const platforms: PlatformType[] = [
  "splint_invest",
  "masterworks",
  "realt",
];

export const platformNames = {
  splint_invest: "Splint Invest",
  masterworks: "Masterworks",
  realt: "RealT",
};

export const createMockSearchParams = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value);
  });
  return searchParams;
};

export const mockFetchResponse = (data: any, status = 200, ok = true) => {
  return Promise.resolve({
    json: () => Promise.resolve(data),
    ok,
    status,
    headers: new Headers(),
    statusText: ok ? "OK" : "Error",
  } as Response);
};
