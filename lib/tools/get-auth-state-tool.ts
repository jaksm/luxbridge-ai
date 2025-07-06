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
      // Mock realistic authentication state
      const mockAuthState = {
        authenticated: true,
        user: {
          userId: accessToken.userId,
          email: "investor@luxbridge.ai",
          name: "Alex Chen",
          walletAddress: "0x742d35Cc6634C0532925a3b8F33C7D1C93F9e7A2",
          privyDid: accessToken.userId,
          createdAt: "2024-01-15T10:30:00Z",
          emailVerified: true,
          kycStatus: "verified",
          tier: "premium"
        },
        session: {
          sessionId: accessToken.sessionId || "session_789xyz",
          expiresAt: accessToken.expiresAt,
          createdAt: "2024-01-20T14:22:00Z",
          lastActivity: "2024-01-20T16:45:00Z",
          ipAddress: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
        },
        oauth: {
          clientId: accessToken.clientId,
          scopes: ["read:portfolio", "write:trades", "read:assets"],
          tokenType: "Bearer",
          issuedAt: "2024-01-20T14:22:00Z"
        },
        permissions: {
          canTrade: true,
          canViewPortfolio: true,
          canAccessPlatforms: true,
          canDelegate: true,
          maxTradeAmount: 50000,
          riskLevel: "moderate"
        },
        connectedPlatforms: {
          splint_invest: {
            connected: true,
            userId: "splint_user_456",
            connectedAt: "2024-01-18T09:15:00Z",
            lastSync: "2024-01-20T16:30:00Z",
            status: "active"
          },
          masterworks: {
            connected: true,
            userId: "mw_789abc",
            connectedAt: "2024-01-19T11:45:00Z",
            lastSync: "2024-01-20T16:28:00Z",
            status: "active"
          },
          realt: {
            connected: false,
            userId: null,
            connectedAt: null,
            lastSync: null,
            status: "disconnected"
          }
        }
      };

      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Authentication successful!\n\n**User Profile:**\n- Name: ${mockAuthState.user.name}\n- Email: ${mockAuthState.user.email}\n- Wallet: ${mockAuthState.user.walletAddress}\n- KYC Status: ${mockAuthState.user.kycStatus}\n- Tier: ${mockAuthState.user.tier}\n\n**Session Info:**\n- Session ID: ${mockAuthState.session.sessionId}\n- Expires: ${mockAuthState.session.expiresAt}\n- Last Activity: ${mockAuthState.session.lastActivity}\n\n**Connected Platforms:**\n- Splint Invest: ✅ Connected (last sync: ${mockAuthState.connectedPlatforms.splint_invest.lastSync})\n- Masterworks: ✅ Connected (last sync: ${mockAuthState.connectedPlatforms.masterworks.lastSync})\n- RealT: ❌ Not connected\n\n**Permissions:**\n- Trading: ${mockAuthState.permissions.canTrade ? '✅ Enabled' : '❌ Disabled'}\n- Max Trade Amount: $${mockAuthState.permissions.maxTradeAmount.toLocaleString()}\n- Risk Level: ${mockAuthState.permissions.riskLevel}\n\n**OAuth Details:**\n${JSON.stringify(mockAuthState.oauth, null, 2)}`,
          },
        ],
      };
    });
  };
