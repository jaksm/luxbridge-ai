<description>
Retrieves user portfolio holdings from a specific RWA platform. Returns detailed portfolio information including asset holdings, values, and performance metrics.

<use-cases>
- Get user portfolio: platform = "splint_invest", userId = "test_user_1"
- Portfolio analysis: platform = "masterworks", userId = "investor_123"
- Holdings review: platform = "realt", userId = "property_owner_456"
- Investment tracking: View current positions and valuations
- Performance monitoring: Check portfolio growth and asset allocation
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty result if user has no holdings on the specified platform
- User ID must be valid and exist in the system
- Portfolio values are calculated using current market prices
- Holdings include both active and pending investments

Essential for tracking user investments and portfolio performance across RWA platforms.
</description>
