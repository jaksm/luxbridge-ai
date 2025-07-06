import type { NextRequest } from "next/server";
import type { AccessToken } from "../../lib/redis-oauth";
import { createMockAccessToken } from "./mock-access-token";

export interface TestAuthConfig {
  bypassAuth: boolean;
  defaultUserIndex: number;
  customAccessToken?: AccessToken;
}

let testConfig: TestAuthConfig = {
  bypassAuth: false,
  defaultUserIndex: 0,
};

export function enableAuthBypass(config: Partial<TestAuthConfig> = {}): void {
  testConfig = {
    bypassAuth: true,
    defaultUserIndex: 0,
    ...config,
  };
  console.log("🔓 Authentication bypass enabled for testing");
}

export function disableAuthBypass(): void {
  testConfig = {
    bypassAuth: false,
    defaultUserIndex: 0,
  };
  console.log("🔒 Authentication bypass disabled");
}

export function isAuthBypassed(): boolean {
  return testConfig.bypassAuth;
}

export async function mockAuthenticateRequest(
  req: NextRequest,
): Promise<AccessToken | null> {
  if (!testConfig.bypassAuth) {
    throw new Error("Auth bypass not enabled. Call enableAuthBypass() first.");
  }

  if (testConfig.customAccessToken) {
    return testConfig.customAccessToken;
  }

  return createMockAccessToken();
}

export function setTestAccessToken(accessToken: AccessToken): void {
  testConfig.customAccessToken = accessToken;
}

export function clearTestAccessToken(): void {
  delete testConfig.customAccessToken;
}

export function getTestConfig(): TestAuthConfig {
  return { ...testConfig };
}
