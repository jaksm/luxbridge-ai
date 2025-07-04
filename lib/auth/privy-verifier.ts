import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);

export async function verifyPrivyToken(
  _req: Request,
  bearerToken?: string,
): Promise<any | undefined> {
  if (!bearerToken) {
    return undefined;
  }

  try {
    const verifiedClaims = await privy.verifyAuthToken(bearerToken);

    return {
      userId: verifiedClaims.userId,
      scopes: ["read", "write"],
      expiresAt: verifiedClaims.expiration,
      metadata: {
        appId: verifiedClaims.appId,
        issuer: verifiedClaims.issuer,
      },
    };
  } catch (error) {
    console.error("Privy token verification failed:", error);
    return undefined;
  }
}
