<description>
Search for assets across linked platforms using stored credentials. Performs semantic search across multiple RWA platforms simultaneously using natural language queries.

<use-cases>
- Cross-platform search: sessionId = "session_123", semanticQuery = "luxury art investments", limit = 10
- Targeted platforms: sessionId = "session_456", platforms = ["masterworks", "splint_invest"], semanticQuery = "high yield"
- Investment discovery: sessionId = "session_789", semanticQuery = "real estate Detroit", platforms = ["realt"]
- Market analysis: Search for similar assets across all linked platforms
- Opportunity finding: Discover investment options matching specific criteria
</use-cases>

🚨 CRITICAL WARNINGS:

- Only searches platforms with active authentication connections
- Skips platforms with expired or failed credentials
- Search timeout may occur with large result sets across multiple platforms

⚠️ IMPORTANT NOTES:

- Semantic query uses AI-powered matching across platform catalogs
- Results include metadata about credential status and search performance
- Platforms with inactive connections are automatically excluded
- Default searches across splint_invest, masterworks, and realt platforms

Essential for discovering investment opportunities across multiple connected RWA platforms using natural language criteria.
</description>
