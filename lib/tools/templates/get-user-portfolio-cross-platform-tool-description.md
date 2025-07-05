<description>
Retrieve user portfolio from specified platform using stored credentials. Fetches real-time portfolio data directly from linked platform accounts.

<use-cases>
- Live portfolio: sessionId = "session_123", platform = "splint_invest"
- Account sync: sessionId = "session_456", platform = "masterworks"
- Portfolio refresh: sessionId = "session_789", platform = "realt"
- Investment tracking: Get current holdings and valuations from platform
- Performance monitoring: Retrieve updated portfolio metrics and returns
</use-cases>

🚨 CRITICAL WARNINGS:

- Requires active platform connection with valid authentication
- Platform must be linked and credentials must be current
- Failed authentication will return connection error

⚠️ IMPORTANT NOTES:

- Returns real-time data directly from platform APIs
- Portfolio values reflect current market conditions
- Platform-specific user credentials are automatically used
- Connection status is validated before API calls

Essential for accessing live portfolio data from connected RWA platform accounts.
</description>
