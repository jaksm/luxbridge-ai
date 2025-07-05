<description>
Search for RWA assets using natural language queries across platforms. Uses AI-powered semantic search to find assets matching investment criteria and preferences.

<use-cases>
- Investment search: query = "high yield wine investments", platform = "splint_invest", limit = 5
- Art discovery: query = "modern contemporary paintings", platform = "masterworks", minScore = 0.7
- Property search: query = "rental properties Detroit", platform = "realt", limit = 10
- Cross-platform: query = "luxury collectibles", platform = null (searches all platforms)
- Risk-based: query = "low risk stable returns", minScore = 0.6, limit = 15
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty results if no assets match the semantic criteria
- Higher minScore values (0.7-1.0) return more precise matches
- Lower minScore values (0.1-0.3) return broader, more diverse results
- Platform parameter is optional - omit to search across all platforms

Essential for discovering RWA investment opportunities using natural language investment criteria.
</description>
