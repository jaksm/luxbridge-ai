<description>
Converts a real-world asset from any platform (Splint Invest, Masterworks, RealT) into tradeable ERC-20 tokens on the blockchain. This creates fractional ownership tokens that can be traded, used as liquidity, or held as investment positions.

<use-cases>
- Tokenize wine investment: platform = "splint_invest", assetId = "BORDEAUX-2019", assetType = "wine"
- Tokenize art piece: platform = "masterworks", assetId = "PICASSO-042", assetType = "art"  
- Tokenize real estate: platform = "realt", assetId = "CHICAGO-001", assetType = "real_estate"
- Create tradeable tokens: Convert illiquid RWA into liquid blockchain tokens for trading
- Enable cross-platform trading: Once tokenized, assets can be traded against each other via AMM
</use-cases>

⚠️ IMPORTANT NOTES:

- Creates new ERC-20 token contract for the asset
- Asset must exist and be validated on the origin platform
- Legal documentation hash required for compliance
- Once tokenized, asset can be traded and used in DeFi protocols
- Returns token contract address for future interactions

Essential for bringing real-world assets onto the blockchain and enabling decentralized trading of physical investments.
</description>
