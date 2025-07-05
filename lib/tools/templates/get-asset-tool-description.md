<description>
Retrieves a specific asset from a RWA platform by platform and asset ID. Returns complete asset information including pricing, metadata, and platform-specific details.

<use-cases>
- Get single asset: platform = "splint_invest", assetId = "WINE-BORDEAUX-001"
- Fetch art piece: platform = "masterworks", assetId = "MONET-WL-2023-004"
- Lookup property: platform = "realt", assetId = "DETROIT-HOUSE-789"
- Asset verification: Validate existence before portfolio operations
- Price checking: Get current market values for specific assets
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns null if asset not found on the specified platform
- Asset IDs are case-sensitive and platform-specific
- Use get_assets_by_platform for browsing available assets first

Essential for retrieving detailed information about specific RWA assets across supported platforms.
</description>
