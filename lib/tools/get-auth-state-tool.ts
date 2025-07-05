import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/get-auth-state-tool-description.md",
  {},
);

export const registerGetAuthStateTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool("get_auth_state", DESCRIPTION, {}, async () => {
      const result = {
        content: [
          {
            type: "text" as const,
            text: `✅ Authentication successful!\n\nAccess Token Info:\n${JSON.stringify(
              {
                userId: accessToken.userId,
                clientId: accessToken.clientId,
                expiresAt: accessToken.expiresAt,
              },
              null,
              2,
            )}`,
          },
        ],
      };

      return result;
    });
  };
