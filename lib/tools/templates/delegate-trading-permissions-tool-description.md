<description>
Grants AI agents controlled trading permissions with strict spending limits and asset restrictions. This enables automated trading while maintaining user control through predefined safety parameters and spending caps.

<use-cases>
- Enable AI trading: maxTradeSize = "10000", maxDailyVolume = "50000", allowedAssets = ["WINE-001", "ART-042"]
- Portfolio automation: Allow AI to rebalance specific assets within defined limits
- Arbitrage delegation: Grant permissions for AI to execute arbitrage opportunities  
- Risk-controlled automation: Set conservative limits for AI trading experimentation
- Asset-specific trading: Limit AI to trade only specified tokens in your portfolio
</use-cases>

🚨 CRITICAL WARNINGS:

- AI can execute trades up to your specified limits without further approval
- Delegation remains active until explicitly revoked
- Monitor AI trading activity regularly and adjust limits as needed
- Start with small limits to test AI trading behavior
- Can be revoked at any time by calling this tool with zero limits

⚠️ IMPORTANT NOTES:

- Spending limits are enforced per trade and per day
- AI cannot trade assets not in the allowedAssets list
- All trades still subject to normal slippage protection
- User retains full control and can override AI decisions anytime

Essential for enabling automated trading while maintaining strict risk controls and user oversight of AI trading activities.
</description>
