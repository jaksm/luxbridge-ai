export async function tokenVerifier(
  bearerToken?: string,
): Promise<any | undefined> {
  if (!bearerToken) {
    return undefined;
  }

  try {
    if (bearerToken.length > 0) {
      return {
        userId: `user_${bearerToken.slice(0, 8)}`,
        scopes: ["read", "write"],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          appId: "mock-app-id",
          issuer: "mock-issuer",
        },
      };
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}
