<description>
Withdraws liquidity from an AMM pool by burning LP (liquidity provider) tokens and receiving the underlying token pair. This allows users to exit their liquidity position and claim accumulated trading fees.

<use-cases>
- Exit liquidity position: liquidity = "1000" → burn 1000 LP tokens for underlying assets
- Partial withdrawal: liquidity = "500" → withdraw half of your liquidity position  
- Claim accumulated fees: LP tokens include earned fees from trading activity
- Rebalance portfolio: Remove liquidity to reallocate capital to different assets
- Emergency exit: Quickly convert LP position back to tradeable tokens
</use-cases>

⚠️ IMPORTANT NOTES:

- Burns LP tokens permanently to redeem underlying assets
- Receives proportional amounts of both tokens in the pool
- Includes all accumulated trading fees earned during liquidity provision
- Slippage protection prevents unfavorable withdrawals during volatility
- Cannot withdraw more LP tokens than you own

Essential for exiting liquidity positions, claiming earned fees, and converting LP tokens back to tradeable assets for portfolio rebalancing.
</description>
