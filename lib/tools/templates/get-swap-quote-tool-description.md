<description>
Calculates the expected output amount for a token swap without executing the trade. This provides a preview of swap results including price impact, slippage, and trading fees for informed decision making.

<use-cases>
- Preview trade results: tokenIn = "WINE-001", tokenOut = "ETH", amountIn = "1000" → see expected ETH output
- Calculate price impact: Compare expected output vs theoretical price for large trades  
- Check trade feasibility: Verify sufficient liquidity exists before attempting swap
- Compare trading routes: Get quotes for different token pairs to find best rates
- Set slippage limits: Use quote to determine appropriate amountOutMin for actual swap
</use-cases>

⚠️ IMPORTANT NOTES:

- Read-only operation with no transaction costs or blockchain changes
- Prices can change between quote and actual execution
- Large trades may have significant price impact due to AMM mechanics
- Quote includes trading fees and reflects current pool liquidity
- Always use recent quotes for time-sensitive trading decisions

Essential for previewing trades, setting appropriate slippage protection, and making informed trading decisions before executing swaps.
</description>
