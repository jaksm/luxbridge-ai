<description>
Get list of RWA platforms supported by LuxBridge with connection status. Shows which platforms are available for linking and their current authentication state.

<use-cases>
- Platform discovery: sessionId = "session_123" (view all available platforms)
- Connection status: Check which platforms are already linked to user account
- Integration planning: See supported platforms before authentication setup
- Account management: Review linked vs unlinked platform accounts
- Feature exploration: Understand LuxBridge's platform coverage
</use-cases>

⚠️ IMPORTANT NOTES:

- Requires valid sessionId from authenticate_luxbridge_user tool
- Shows both linked and unlinked platforms with status indicators
- Platform availability may vary by user region and verification level
- Use generate_platform_auth_links to connect unlinked platforms

Essential for understanding platform integration capabilities and managing cross-platform connections.
</description>
