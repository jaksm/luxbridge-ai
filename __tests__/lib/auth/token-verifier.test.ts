import { describe, it, expect } from "vitest";
import { tokenVerifier } from "@/lib/auth/token-verifier";

describe("tokenVerifier", () => {
  it("should return undefined for undefined token", async () => {
    const result = await tokenVerifier(undefined);
    expect(result).toBeUndefined();
  });

  it("should return undefined for empty string token", async () => {
    const result = await tokenVerifier("");
    expect(result).toBeUndefined();
  });

  it("should return user data for valid token", async () => {
    const token = "valid_token_123";
    const result = await tokenVerifier(token);

    expect(result).toBeDefined();
    expect(result.userId).toBe(`user_${token.slice(0, 8)}`);
    expect(result.scopes).toEqual(["read", "write"]);
    expect(result.expiresAt).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/,
    );
    expect(result.metadata).toEqual({
      appId: "mock-app-id",
      issuer: "mock-issuer",
    });
  });

  it("should return consistent userId for same token", async () => {
    const token = "consistent_token";
    const result1 = await tokenVerifier(token);
    const result2 = await tokenVerifier(token);

    expect(result1.userId).toBe(result2.userId);
    expect(result1.userId).toBe(`user_${token.slice(0, 8)}`);
  });

  it("should set expiration 24 hours from now", async () => {
    const token = "test_token";
    const result = await tokenVerifier(token);

    const expiresAt = new Date(result.expiresAt);
    const now = new Date();
    const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
    expect(timeDiff).toBeLessThan(1000);
  });

  it("should handle short tokens correctly", async () => {
    const token = "abc";
    const result = await tokenVerifier(token);

    expect(result.userId).toBe(`user_${token}`);
  });

  it("should handle long tokens correctly", async () => {
    const token = "this_is_a_very_long_token_string_with_many_characters";
    const result = await tokenVerifier(token);

    expect(result.userId).toBe(`user_${token.slice(0, 8)}`);
    expect(result.userId).toBe("user_this_is_");
  });
});
