import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  AssetTokenized,
  AssetBurned,
  ValuationUpdated,
  CrossPlatformSwap,
} from "../generated/RWATokenFactory/RWATokenFactory";
import {
  PoolCreated,
  LiquidityAdded,
  LiquidityRemoved,
  Swap,
} from "../generated/LuxBridgeAMM/LuxBridgeAMM";
import {
  PriceUpdated,
  ArbitrageOpportunity,
} from "../generated/LuxBridgePriceOracle/LuxBridgePriceOracle";
import {
  Platform,
  Asset,
  TokenizationEvent,
  AssetBurnEvent,
  ValuationUpdateEvent,
  LiquidityPool,
  LiquidityEvent,
  SwapEvent,
  CrossPlatformTrade,
  PriceUpdate,
  ArbitrageOpportunity as ArbitrageOpportunityEntity,
  DailyStats,
} from "../generated/schema";

// RWATokenFactory Event Handlers

export function handleAssetTokenized(event: AssetTokenized): void {
  let platformId = event.params.platform.toString();
  let platform = Platform.load(platformId);

  if (platform == null) {
    platform = new Platform(platformId);
    platform.name = event.params.platform.toString();
    platform.apiEndpoint = "";
    platform.isActive = true;
    platform.totalAssetsTokenized = BigInt.fromI32(0);
    platform.totalValueLocked = BigInt.fromI32(0);
    platform.createdAt = event.block.timestamp;
    platform.updatedAt = event.block.timestamp;
  }

  platform.totalAssetsTokenized = platform.totalAssetsTokenized.plus(
    BigInt.fromI32(1),
  );
  platform.totalValueLocked = platform.totalValueLocked.plus(
    event.params.valuation,
  );
  platform.updatedAt = event.block.timestamp;
  platform.save();

  let assetId =
    event.params.platform.toString() + "-" + event.params.assetId.toString();
  let asset = new Asset(assetId);
  asset.platform = platformId;
  asset.platformAssetId = event.params.assetId.toString();
  asset.assetType = "unknown";
  asset.tokenAddress = event.params.tokenAddress;
  asset.totalSupply = event.params.totalSupply;
  asset.lastValuation = event.params.valuation;
  asset.valuationTimestamp = event.block.timestamp;
  asset.legalHash = Bytes.fromI32(0);
  asset.isActive = true;
  asset.createdAt = event.block.timestamp;
  asset.save();

  let tokenizationEvent = new TokenizationEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
  );
  tokenizationEvent.asset = assetId;
  tokenizationEvent.tokenAddress = event.params.tokenAddress;
  tokenizationEvent.totalSupply = event.params.totalSupply;
  tokenizationEvent.valuation = event.params.valuation;
  tokenizationEvent.user = event.transaction.from;
  tokenizationEvent.timestamp = event.block.timestamp;
  tokenizationEvent.blockNumber = event.block.number;
  tokenizationEvent.transactionHash = event.transaction.hash;
  tokenizationEvent.save();

  updateDailyStats(event.block.timestamp, BigInt.fromI32(0), BigInt.fromI32(1));
}

export function handleAssetBurned(event: AssetBurned): void {
  let assetId =
    event.params.platform.toString() + "-" + event.params.assetId.toString();
  let asset = Asset.load(assetId);

  if (asset != null) {
    let burnEvent = new AssetBurnEvent(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    burnEvent.asset = assetId;
    burnEvent.holder = event.params.holder;
    burnEvent.amount = event.params.amount;
    burnEvent.timestamp = event.block.timestamp;
    burnEvent.blockNumber = event.block.number;
    burnEvent.transactionHash = event.transaction.hash;
    burnEvent.save();
  }
}

export function handleValuationUpdated(event: ValuationUpdated): void {
  let assetId =
    event.params.platform.toString() + "-" + event.params.assetId.toString();
  let asset = Asset.load(assetId);

  if (asset != null) {
    asset.lastValuation = event.params.newValuation;
    asset.valuationTimestamp = event.params.timestamp;
    asset.save();

    let platform = Platform.load(event.params.platform.toString());
    if (platform != null) {
      platform.totalValueLocked = platform.totalValueLocked
        .minus(event.params.oldValuation)
        .plus(event.params.newValuation);
      platform.updatedAt = event.block.timestamp;
      platform.save();
    }

    let valuationUpdate = new ValuationUpdateEvent(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    valuationUpdate.asset = assetId;
    valuationUpdate.oldValuation = event.params.oldValuation;
    valuationUpdate.newValuation = event.params.newValuation;
    valuationUpdate.timestamp = event.block.timestamp;
    valuationUpdate.blockNumber = event.block.number;
    valuationUpdate.transactionHash = event.transaction.hash;
    valuationUpdate.save();
  }
}

export function handleCrossPlatformSwap(event: CrossPlatformSwap): void {
  let sellAssetId =
    event.params.sellPlatform.toString() +
    "-" +
    event.params.sellAssetId.toString();
  let buyAssetId =
    event.params.buyPlatform.toString() +
    "-" +
    event.params.buyAssetId.toString();

  let sellAsset = Asset.load(sellAssetId);
  let buyAsset = Asset.load(buyAssetId);

  if (sellAsset != null && buyAsset != null) {
    let trade = new CrossPlatformTrade(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    trade.user = event.params.user;
    trade.sellAsset = sellAssetId;
    trade.buyAsset = buyAssetId;
    trade.platform = event.params.sellPlatform.toString();
    trade.sellAmount = event.params.sellAmount;
    trade.buyAmount = event.params.buyAmount;

    if (event.params.sellAmount.gt(BigInt.fromI32(0))) {
      trade.executionPrice = event.params.buyAmount
        .times(BigInt.fromI32(10000))
        .div(event.params.sellAmount);
    } else {
      trade.executionPrice = BigInt.fromI32(0);
    }

    trade.arbitrageSpread = BigInt.fromI32(0);
    trade.timestamp = event.block.timestamp;
    trade.blockNumber = event.block.number;
    trade.transactionHash = event.transaction.hash;
    trade.save();

    updateDailyStats(
      event.block.timestamp,
      event.params.sellAmount.plus(event.params.buyAmount),
      BigInt.fromI32(1),
    );
  }
}

// LuxBridgeAMM Event Handlers

export function handlePoolCreated(event: PoolCreated): void {
  let poolId = event.params.poolId.toHex();
  let pool = new LiquidityPool(poolId);
  pool.tokenA = event.params.tokenA;
  pool.tokenB = event.params.tokenB;
  pool.reserveA = BigInt.fromI32(0);
  pool.reserveB = BigInt.fromI32(0);
  pool.totalLiquidity = BigInt.fromI32(0);
  pool.swapFee = BigInt.fromI32(30);
  pool.isActive = true;
  pool.createdAt = event.block.timestamp;
  pool.assets = [];
  pool.save();
}

export function handleLiquidityAdded(event: LiquidityAdded): void {
  let poolId = event.params.poolId.toHex();
  let pool = LiquidityPool.load(poolId);

  if (pool != null) {
    pool.reserveA = pool.reserveA.plus(event.params.amountA);
    pool.reserveB = pool.reserveB.plus(event.params.amountB);
    pool.totalLiquidity = pool.totalLiquidity.plus(event.params.liquidity);
    pool.save();

    let liquidityEvent = new LiquidityEvent(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    liquidityEvent.pool = poolId;
    liquidityEvent.provider = event.params.provider;
    liquidityEvent.amountA = event.params.amountA;
    liquidityEvent.amountB = event.params.amountB;
    liquidityEvent.liquidity = event.params.liquidity;
    liquidityEvent.eventType = "ADD";
    liquidityEvent.timestamp = event.block.timestamp;
    liquidityEvent.blockNumber = event.block.number;
    liquidityEvent.transactionHash = event.transaction.hash;
    liquidityEvent.save();
  }
}

export function handleLiquidityRemoved(event: LiquidityRemoved): void {
  let poolId = event.params.poolId.toHex();
  let pool = LiquidityPool.load(poolId);

  if (pool != null) {
    pool.reserveA = pool.reserveA.minus(event.params.amountA);
    pool.reserveB = pool.reserveB.minus(event.params.amountB);
    pool.totalLiquidity = pool.totalLiquidity.minus(event.params.liquidity);
    pool.save();

    let liquidityEvent = new LiquidityEvent(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    liquidityEvent.pool = poolId;
    liquidityEvent.provider = event.params.provider;
    liquidityEvent.amountA = event.params.amountA;
    liquidityEvent.amountB = event.params.amountB;
    liquidityEvent.liquidity = event.params.liquidity;
    liquidityEvent.eventType = "REMOVE";
    liquidityEvent.timestamp = event.block.timestamp;
    liquidityEvent.blockNumber = event.block.number;
    liquidityEvent.transactionHash = event.transaction.hash;
    liquidityEvent.save();
  }
}

export function handleSwap(event: Swap): void {
  let poolId = event.params.poolId.toHex();
  let pool = LiquidityPool.load(poolId);

  if (pool != null) {
    let swapEvent = new SwapEvent(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
    );
    swapEvent.pool = poolId;
    swapEvent.trader = event.params.trader;
    swapEvent.tokenIn = event.params.tokenIn;
    swapEvent.tokenOut = event.params.tokenOut;
    swapEvent.amountIn = event.params.amountIn;
    swapEvent.amountOut = event.params.amountOut;
    swapEvent.timestamp = event.block.timestamp;
    swapEvent.blockNumber = event.block.number;
    swapEvent.transactionHash = event.transaction.hash;
    swapEvent.save();

    updateDailyStats(
      event.block.timestamp,
      event.params.amountIn.plus(event.params.amountOut),
      BigInt.fromI32(1),
    );
  }
}

// Oracle Event Handlers

export function handlePriceUpdated(event: PriceUpdated): void {
  let priceUpdate = new PriceUpdate(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
  );
  priceUpdate.platform = event.params.platform.toString();
  priceUpdate.assetId = event.params.assetId.toString();
  priceUpdate.price = event.params.price;
  priceUpdate.timestamp = event.params.timestamp;
  priceUpdate.blockNumber = event.block.number;
  priceUpdate.transactionHash = event.transaction.hash;
  priceUpdate.save();
}

export function handleArbitrageOpportunity(event: ArbitrageOpportunity): void {
  let arbitrage = new ArbitrageOpportunityEntity(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
  );
  arbitrage.assetId = event.params.assetId.toString();
  arbitrage.spread = event.params.spread;
  arbitrage.threshold = event.params.threshold;
  arbitrage.timestamp = event.block.timestamp;
  arbitrage.blockNumber = event.block.number;
  arbitrage.transactionHash = event.transaction.hash;
  arbitrage.save();

  updateDailyStats(event.block.timestamp, BigInt.fromI32(0), BigInt.fromI32(0));
}

// Helper Functions

function updateDailyStats(
  timestamp: BigInt,
  volume: BigInt,
  trades: BigInt,
): void {
  let dayId = timestamp.toI32() / 86400;
  let dailyStats = DailyStats.load(dayId.toString());

  if (dailyStats == null) {
    dailyStats = new DailyStats(dayId.toString());
    dailyStats.date = dayId;
    dailyStats.totalVolume = BigInt.fromI32(0);
    dailyStats.totalTrades = BigInt.fromI32(0);
    dailyStats.totalArbitrageOpportunities = BigInt.fromI32(0);
    dailyStats.averageSpread = BigInt.fromI32(0);
    dailyStats.activeAssets = BigInt.fromI32(0);
    dailyStats.activePlatforms = BigInt.fromI32(0);
  }

  dailyStats.totalVolume = dailyStats.totalVolume.plus(volume);
  dailyStats.totalTrades = dailyStats.totalTrades.plus(trades);
  dailyStats.save();
}
