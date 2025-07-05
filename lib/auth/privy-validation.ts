import { PrivyClient } from "@privy-io/server-auth";
import { LuxBridgeUser } from "@/lib/types/luxbridge-auth";

const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID || "",
  process.env.PRIVY_APP_SECRET || "",
);

export async function validatePrivyToken(
  token: string,
): Promise<LuxBridgeUser | null> {
  try {
    if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
      throw new Error(
        "Missing Privy credentials. Please set PRIVY_APP_ID and PRIVY_APP_SECRET environment variables.",
      );
    }

    const verifiedClaims = await privyClient.verifyAuthToken(token);

    if (!verifiedClaims.userId) {
      return null;
    }

    const user = await privyClient.getUser(verifiedClaims.userId);

    if (!user) {
      return null;
    }

    // Find email from linked accounts
    const emailAccount = user.linkedAccounts?.find(
      (account: any) => account.type === "email",
    ) as any;
    const email = user.email?.address || emailAccount?.address;

    if (!email) {
      return null;
    }

    // Find wallet address
    const walletAccount = user.linkedAccounts?.find(
      (account: any) => account.type === "wallet",
    ) as any;
    const walletAddress = walletAccount?.address;

    const luxBridgeUser: LuxBridgeUser = {
      userId: `lux_${user.id}`,
      privyId: user.id,
      email,
      name: email,
      walletAddress,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    return luxBridgeUser;
  } catch (error) {
    console.error("Privy token validation failed:", error);
    return null;
  }
}

export function extractPrivyTokenFromHeader(authHeader: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "");
}
