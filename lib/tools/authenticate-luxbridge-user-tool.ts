import { validatePrivyToken } from "@/lib/auth/privy-validation";
import {
  createAuthSession,
  storeLuxBridgeUser,
} from "@/lib/auth/session-manager";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { AuthenticateLuxBridgeUserSchema } from "@/lib/types/schemas";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/authenticate-luxbridge-user-tool-description.md",
  {},
);

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
