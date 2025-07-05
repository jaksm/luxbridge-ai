<description>
Executes direct token-to-token swaps through the automated market maker (AMM) system. This enables trading between any tokenized real-world assets or converting assets to ETH/stablecoins for liquidity.

<use-cases>
- Cross-RWA trading: tokenIn = "WINE-001", tokenOut = "ART-042" → trade wine tokens for art tokens
- Convert to ETH: tokenIn = "REAL-ESTATE-001", tokenOut = "ETH" → liquidate real estate position
- Arbitrage trading: Execute profitable trades between different asset classes
- Portfolio rebalancing: Swap overweight positions into underweight assets
- Quick liquidation: Convert any RWA token to liquid assets (ETH/stablecoins)
</use-cases>

⚠️ IMPORTANT NOTES:

- Executes immediately at current market prices through AMM pools
- Slippage protection prevents trades during unfavorable price movements
- Must have sufficient balance of input token and token approval
- Trading fees automatically deducted and distributed to liquidity providers
- Large trades may experience higher slippage due to AMM mechanics

Essential for cross-platform RWA trading, portfolio rebalancing, and converting between tokenized assets and liquid cryptocurrencies.
</description>
