<description>
Generate authentication links for specified platforms. Creates time-limited URLs that users can visit to link their platform accounts to LuxBridge.

<use-cases>
- Single platform: sessionId = "session_123", platforms = ["splint_invest"]
- Multiple platforms: sessionId = "session_456", platforms = ["masterworks", "realt"]
- Portfolio setup: Generate auth links for all desired investment platforms
- Account linking: Create secure URLs for platform OAuth flows
- Re-authentication: Generate new links when platform tokens expire
</use-cases>

🚨 CRITICAL WARNINGS:

- Authentication links expire in 10 minutes for security
- Session must be valid and non-expired before generating links
- Each platform requires separate authentication flow completion

⚠️ IMPORTANT NOTES:

- Generated URLs redirect to platform-specific OAuth flows
- Users must complete authentication on each platform individually
- Successful linking enables cross-platform portfolio operations

Essential for connecting external RWA platform accounts to LuxBridge for unified portfolio management.
</description>
