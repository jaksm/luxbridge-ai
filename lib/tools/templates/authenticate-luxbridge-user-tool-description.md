<description>
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
</description>
