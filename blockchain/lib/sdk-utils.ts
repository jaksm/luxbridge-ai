import { ethers } from "ethers";
import { LuxBridgeSDK } from "../index";

export interface PortfolioAsset {
  platform: string;
  assetId: string;
  tokenAddress: string;
  balance: string;
  value: string;
  metadata: any;
}

export interface LiquidityPosition {
  poolId: string;
  tokenA: string;
  tokenB: string;
  lpBalance: string;
  tokenAAmount: string;
  tokenBAmount: string;
  totalValue: string;
}

export interface TradingStats {
  totalVolume24h: string;
  totalTrades24h: number;
  topTradedAssets: Array<{
    assetId: string;
    volume: string;
    trades: number;
  }>;
}

export class SDKUtils {
  constructor(private sdk: LuxBridgeSDK) {}

  // Portfolio management utilities
  async getPortfolio(userAddress: string): Promise<PortfolioAsset[]> {
    // Get all tokenized assets
    const tokenizedEvents = await this.sdk.queryEvents(
      "factory",
      "AssetTokenized",
    );
    const portfolio: PortfolioAsset[] = [];

    for (const event of tokenizedEvents) {
      const { platform, assetId, tokenAddress } = event.args;
      const token = await this.sdk.getTokenContract(tokenAddress);

      try {
        const balance = await token.balanceOf(userAddress);
        if (balance > 0n) {
          const metadata = await this.sdk.getAssetMetadata({
            platform,
            assetId,
          });
          const value =
            (balance * BigInt(metadata.sharePrice)) / ethers.parseEther("1");

          portfolio.push({
            platform,
            assetId,
            tokenAddress,
            balance: ethers.formatEther(balance),
            value: ethers.formatEther(value),
            metadata,
          });
        }
      } catch (error) {
        // Skip if error reading balance
      }
    }

    return portfolio;
  }

  // Liquidity position tracking
  async getLiquidityPositions(
    userAddress: string,
  ): Promise<LiquidityPosition[]> {
    const positions: LiquidityPosition[] = [];
    const liquidityEvents = await this.sdk.queryEvents("amm", "LiquidityAdded");

    for (const event of liquidityEvents) {
      if (event.args.provider === userAddress) {
        const { tokenA, tokenB, liquidity } = event.args;
        const poolId = await this.sdk.amm.getPoolId(tokenA, tokenB);

        try {
          const lpToken = await (this.sdk.amm as any).lpTokens(poolId);
          const lpContract = await this.sdk.getTokenContract(lpToken);
          const lpBalance = await lpContract.balanceOf(userAddress);

          if (lpBalance > 0n) {
            const pool = await this.sdk.amm.pools(poolId);
            const totalSupply = await lpContract.totalSupply();

            // Calculate proportional share
            const sharePercent = (lpBalance * 10000n) / totalSupply;
            const tokenAAmount = (pool.reserveA * sharePercent) / 10000n;
            const tokenBAmount = (pool.reserveB * sharePercent) / 10000n;

            positions.push({
              poolId,
              tokenA,
              tokenB,
              lpBalance: ethers.formatEther(lpBalance),
              tokenAAmount: ethers.formatEther(tokenAAmount),
              tokenBAmount: ethers.formatEther(tokenBAmount),
              totalValue: "0", // Calculate based on current prices
            });
          }
        } catch (error) {
          // Skip if error
        }
      }
    }

    return positions;
  }

  // Price helpers
  async getTokenPrice(tokenAddress: string): Promise<string> {
    // Find platform and assetId from token address
    const tokenizedEvents = await this.sdk.queryEvents(
      "factory",
      "AssetTokenized",
    );

    for (const event of tokenizedEvents) {
      if (
        event.args.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      ) {
        const { platform, assetId } = event.args;
        const priceData = await this.sdk.getPrice({ platform, assetId });
        return priceData.price;
      }
    }

    throw new Error("Token not found");
  }

  // Trading analytics
  async getTradingStats(period: number = 24 * 60 * 60): Promise<TradingStats> {
    const currentBlock = await this.sdk.provider.getBlockNumber();
    const blocksPerSecond = 12; // Approximate
    const periodBlocks = period / blocksPerSecond;
    const fromBlock = Math.max(0, currentBlock - periodBlocks);

    const swapEvents = await this.sdk.queryEvents("amm", "Swap", fromBlock);

    let totalVolume = 0n;
    const assetVolumes = new Map<string, { volume: bigint; trades: number }>();

    for (const event of swapEvents) {
      const { amountIn, tokenIn } = event.args;
      totalVolume += amountIn;

      const key = tokenIn;
      const existing = assetVolumes.get(key) || { volume: 0n, trades: 0 };
      assetVolumes.set(key, {
        volume: existing.volume + amountIn,
        trades: existing.trades + 1,
      });
    }

    const topTradedAssets = Array.from(assetVolumes.entries())
      .sort((a, b) => Number(b[1].volume - a[1].volume))
      .slice(0, 10)
      .map(([assetId, stats]) => ({
        assetId,
        volume: ethers.formatEther(stats.volume),
        trades: stats.trades,
      }));

    return {
      totalVolume24h: ethers.formatEther(totalVolume),
      totalTrades24h: swapEvents.length,
      topTradedAssets,
    };
  }

  // Arbitrage helpers
  async findArbitrageOpportunities(minSpreadPercent: number = 0.5): Promise<
    Array<{
      assetId: string;
      platformA: string;
      platformB: string;
      spreadPercent: number;
      profitEstimate: string;
    }>
  > {
    const opportunities = [];
    const platforms = ["splint_invest", "masterworks", "realt"];

    // Get all tokenized assets
    const tokenizedEvents = await this.sdk.queryEvents(
      "factory",
      "AssetTokenized",
    );
    const uniqueAssets = new Set(
      tokenizedEvents.map((e: any) => e.args.assetId),
    );

    for (const assetId of Array.from(uniqueAssets) as string[]) {
      for (let i = 0; i < platforms.length; i++) {
        for (let j = i + 1; j < platforms.length; j++) {
          try {
            const spread = await this.sdk.calculateArbitrageSpread({
              assetId,
              platformA: platforms[i],
              platformB: platforms[j],
            });

            if (spread.spreadPercentage >= minSpreadPercent) {
              opportunities.push({
                assetId,
                platformA: platforms[i],
                platformB: platforms[j],
                spreadPercent: spread.spreadPercentage,
                profitEstimate: "0", // Calculate based on trade size
              });
            }
          } catch (error) {
            // Skip if no price data
          }
        }
      }
    }

    return opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);
  }

  // Token approval helpers
  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount?: string,
  ): Promise<ethers.TransactionReceipt> {
    const token = await this.sdk.getTokenContract(tokenAddress);
    const amountToApprove = amount
      ? ethers.parseEther(amount)
      : ethers.MaxUint256;

    const tx = await token.approve(spenderAddress, amountToApprove);
    const receipt = await tx.wait();

    if (!receipt) throw new Error("Approval transaction failed");
    return receipt;
  }

  async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ): Promise<string> {
    const token = await this.sdk.getTokenContract(tokenAddress);
    const allowance = await token.allowance(ownerAddress, spenderAddress);
    return ethers.formatEther(allowance);
  }

  // Pool analytics
  async getPoolStats(
    tokenA: string,
    tokenB: string,
  ): Promise<{
    exists: boolean;
    reserve0: string;
    reserve1: string;
    totalLiquidity: string;
    feeRate: number;
    volume24h: string;
  }> {
    try {
      const poolId = await this.sdk.amm.getPoolId(tokenA, tokenB);
      const pool = await this.sdk.amm.pools(poolId);

      if (pool.reserveA === 0n) {
        return {
          exists: false,
          reserve0: "0",
          reserve1: "0",
          totalLiquidity: "0",
          feeRate: 0,
          volume24h: "0",
        };
      }

      // Get 24h volume from events
      const currentBlock = await this.sdk.provider.getBlockNumber();
      const dayAgoBlock = currentBlock - (24 * 60 * 60) / 12; // ~12s blocks

      const swapEvents = await this.sdk.queryEvents("amm", "Swap", dayAgoBlock);
      const poolSwaps = swapEvents.filter(
        (e) =>
          (e.args.tokenIn === tokenA && e.args.tokenOut === tokenB) ||
          (e.args.tokenIn === tokenB && e.args.tokenOut === tokenA),
      );

      const volume24h = poolSwaps.reduce(
        (sum, event) => sum + event.args.amountIn,
        0n,
      );

      return {
        exists: true,
        reserve0: ethers.formatEther(pool.reserveA),
        reserve1: ethers.formatEther(pool.reserveB),
        totalLiquidity: ethers.formatEther(pool.totalLiquidity),
        feeRate: Number(pool.swapFee) / 100,
        volume24h: ethers.formatEther(volume24h),
      };
    } catch (error) {
      return {
        exists: false,
        reserve0: "0",
        reserve1: "0",
        totalLiquidity: "0",
        feeRate: 0,
        volume24h: "0",
      };
    }
  }

  // Format helpers
  formatAssetId(platform: string, assetId: string): string {
    return `${platform}:${assetId}`;
  }

  parseAssetId(formattedId: string): { platform: string; assetId: string } {
    const [platform, ...assetIdParts] = formattedId.split(":");
    return {
      platform,
      assetId: assetIdParts.join(":"),
    };
  }
}
