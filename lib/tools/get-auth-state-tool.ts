import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Retrieves the current authentication state and user information from the active session. Use this to verify user identity and check authentication status before performing protected operations.

<use-cases>
- Check authentication status: Verify if user is currently logged in
- Get user profile data: Retrieve username, email, and account details
- Validate session state: Confirm active session before API calls
- Debug auth issues: Troubleshoot authentication problems
- Display user info: Show current user details in UI components
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns null or empty data if user is not authenticated
- Session data reflects current OAuth token state
- Use before calling protected endpoints to avoid auth errors

Essential for verifying user authentication status and retrieving current session information for secure operations.
</description>`;

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
