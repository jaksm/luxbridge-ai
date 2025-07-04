import { PlatformAsset, UserPortfolioHolding, PlatformType } from "../types/platformAsset";
import { assetStorage } from "../storage/redisClient";

export async function constructUserPortfolio(
  holdings: UserPortfolioHolding[],
  platform: PlatformType
): Promise<Array<PlatformAsset & UserPortfolioHolding & { currentValue: number; unrealizedGain: number }>> {
  const constructedAssets = await Promise.all(
    holdings.map(async (holding) => {
      const platformAsset = await assetStorage.getAsset({ 
        platform, 
        assetId: holding.assetId 
      });
      
      if (!platformAsset) {
        throw new Error(`Asset not found: ${holding.assetId}`);
      }
      
      const sharePrice = platformAsset.valuation.sharePrice;
      const currentValue = sharePrice * holding.sharesOwned;
      const unrealizedGain = (sharePrice - holding.acquisitionPrice) * holding.sharesOwned;
      
      return {
        ...platformAsset,
        ...holding,
        currentValue,
        unrealizedGain
      };
    })
  );
  
  return constructedAssets;
}

export function calculatePortfolioMetrics(holdings: Array<{ currentValue: number; unrealizedGain: number }>) {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalGain = holdings.reduce((sum, holding) => sum + holding.unrealizedGain, 0);
  const totalReturn = totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;
  
  return {
    totalValue,
    totalGain,
    totalReturn,
    assetCount: holdings.length
  };
}

export function calculateDiversificationScore(assets: PlatformAsset[]): number {
  const categories = new Set(assets.map(asset => asset.category));
  const riskCategories = new Set(assets.map(asset => asset.expertAnalysis.riskProfile.riskCategory));
  
  const categoryScore = Math.min(categories.size / 3, 1);
  const riskScore = Math.min(riskCategories.size / 4, 1);
  
  return (categoryScore + riskScore) / 2;
}

export function calculateLiquidityScore(assets: PlatformAsset[]): number {
  const avgLiquidityYears = assets.reduce((sum, asset) => 
    sum + asset.expertAnalysis.investmentHorizon.minimumYears, 0
  ) / assets.length;
  
  return Math.max(0, 1 - (avgLiquidityYears / 10));
}

export function calculateRiskScore(assets: PlatformAsset[]): number {
  const avgRiskScore = assets.reduce((sum, asset) => 
    sum + asset.expertAnalysis.riskProfile.overallRiskScore, 0
  ) / assets.length;
  
  return avgRiskScore / 10;
}
