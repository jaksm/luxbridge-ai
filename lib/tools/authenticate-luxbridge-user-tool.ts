import { validatePrivyToken } from "@/lib/auth/privy-validation";
import {
  createAuthSession,
  storeLuxBridgeUser,
} from "@/lib/auth/session-manager";
import { AuthenticateLuxBridgeUserSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Authenticate user with LuxBridge using Privy token and establish MCP session. Creates secure session for cross-platform operations and portfolio management.

<use-cases>
- Initial login: privyToken = "eyJhbGciOiJIUzI1NiIs..." (Privy JWT token)
- Session creation: Establishes 15-minute MCP session for API access
- User verification: Validates Privy authentication before platform linking
- Security setup: Required before using cross-platform portfolio tools
- Multi-platform auth: Gateway to linking external RWA platform accounts
</use-cases>

🚨 CRITICAL WARNINGS:

- Privy token must be valid and non-expired
- Session expires in 15 minutes and requires re-authentication
- Failed authentication blocks access to all cross-platform features

⚠️ IMPORTANT NOTES:

- Returns sessionId required for all subsequent cross-platform operations
- User data is temporarily stored for session duration only
- Session management follows OAuth 2.1 security standards

Essential first step for establishing authenticated LuxBridge sessions and accessing cross-platform RWA features.
</description>`;

export const registerAuthenticateLuxBridgeUserTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "authenticate_luxbridge_user",
      DESCRIPTION,
      AuthenticateLuxBridgeUserSchema.shape,
      async ({ privyToken }) => {
        try {
          const luxUser = await validatePrivyToken(privyToken);
          if (!luxUser) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ Invalid Privy token. Please authenticate with Privy first.",
                },
              ],
            };
          }

          await storeLuxBridgeUser(luxUser);
          const sessionId = await createAuthSession(luxUser.userId, privyToken);

          return {
            content: [
              {
                type: "text" as const,
                text: `✅ LuxBridge authentication successful!\n\nSession ID: ${sessionId}\nUser: ${luxUser.name} (${luxUser.email})\nSession expires in 15 minutes\n\nYou can now link platform accounts and perform cross-platform operations.`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Authentication failed: ${error}`,
              },
            ],
          };
        }
      },
    );
  };
