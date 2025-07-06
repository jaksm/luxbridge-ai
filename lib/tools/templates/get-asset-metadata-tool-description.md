<description>
Retrieves comprehensive blockchain metadata for a tokenized real-world asset. This provides current on-chain information including valuation, supply, pricing, and platform details for any asset that has been tokenized.

<use-cases>
- Check asset valuation: platform = "splint_invest", assetId = "WINE-001" → current market value and share price
- Verify token supply: Get total supply, available shares, and circulation data
- Portfolio valuation: Retrieve current values for portfolio calculation and analysis  
- Trading preparation: Get latest asset metadata before executing swaps or trades
- Asset verification: Confirm asset exists and get official blockchain record
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns data from blockchain contracts, not platform APIs
- Values reflect latest on-chain state (updated by background sync)
- All monetary values in USD equivalent
- Includes both original tokenization data and current market values
- Read-only operation with no transaction costs

Essential for retrieving current blockchain state of tokenized assets for trading, portfolio management, and asset verification.
</description>
