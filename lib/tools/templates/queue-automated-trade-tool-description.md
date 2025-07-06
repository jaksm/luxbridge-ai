<description>
Schedules an automated trade for later execution when market conditions are optimal. The trade is queued with specific parameters and deadline, allowing AI to execute when timing is advantageous while respecting user-defined constraints.

<use-cases>
- Schedule rebalancing: sellAsset = "WINE-001", buyAsset = "ART-042", amount = "5000", deadline in 24 hours
- Arbitrage opportunities: Queue profitable trades to be executed when spreads are favorable
- Market timing: Schedule trades to execute during optimal market conditions
- Automated DCA: Queue regular trades for dollar-cost averaging strategies
- Portfolio optimization: Schedule trades to achieve target asset allocation
</use-cases>

⚠️ IMPORTANT NOTES:

- Requires active trading delegation with sufficient limits
- Trade will only execute if all conditions are met at execution time
- Includes deadline - trade expires if not executed by specified time
- Must respect delegated spending limits and allowed assets
- AI will execute automatically when conditions are optimal

Essential for strategic trading automation, market timing optimization, and enabling AI to execute trades at the most advantageous moments.
</description>
