export type PlatformType = "splint_invest" | "masterworks" | "realt";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "CHF";

export interface PlatformAsset {
  assetId: string;
  name: string;
  category: string;
  subcategory?: string;
  
  valuation: {
    currentValue: number;
    sharePrice: number;
    totalShares: number;
    availableShares: number;
    currency: CurrencyCode;
    lastValuationDate: string;
    valuationFrequency: "monthly" | "quarterly" | "annual";
  };
  
  expertAnalysis: {
    investmentHorizon: {
      minimumYears: number;
      optimalYears: number;
      maximumYears: number;
      rationale: string;
      liquidityExpectation: string;
    };
    riskProfile: {
      overallRiskScore: number;
      riskCategory: "conservative" | "moderate" | "aggressive" | "speculative";
      returnCategory: "stable" | "growth" | "high_growth" | "speculative";
      riskFactors: string[];
      mitigationStrategies: string;
    };
    yieldProjections: {
      conservativeAnnualYield: number;
      realisticAnnualYield: number;
      optimisticAnnualYield: number;
      yieldAssumptions: string;
      lastReviewDate: string;
    };
    expertProfile: {
      verifyingExpert: string;
      expertSpecialization: string[];
      trackRecord: string;
      performanceHistory: string;
      certifications: string[];
      yearsExperience: number;
    };
  };
  
  physicalAttributes: {
    description: string;
    characteristics: string;
    condition: string;
    provenance: string;
  };
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: string;
    dataSource: string;
    lastSyncedAt: string;
  };
}

export interface UserPortfolioHolding {
  assetId: string;
  sharesOwned: number;
  acquisitionPrice: number;
  acquisitionDate: string;
  currentValue?: number;
  unrealizedGain?: number;
}

export interface UserPortfolio {
  userId: string;
  platform: PlatformType;
  holdings: UserPortfolioHolding[];
  totalValue: number;
  lastUpdated: string;
}

export interface PlatformInfo {
  platform: PlatformType;
  name: string;
  description: string;
  totalAssets: number;
  totalValue: number;
  assetCategories: Array<{
    category: string;
    count: number;
    totalValue: number;
  }>;
  supportedFeatures: string[];
  lastUpdated: string;
}

export interface ArbitrageOpportunity {
  buyPlatform: PlatformType;
  sellPlatform: PlatformType;
  assetMatch: number;
  profitPotential: number;
}

export interface RebalanceRecommendation {
  action: "buy" | "sell";
  platform: PlatformType;
  assetId: string;
  reasoning: string;
}

export interface CrossPlatformAnalysis {
  portfolioAnalysis: {
    totalValue: number;
    crossPlatformRisk: number;
    diversificationScore: number;
    liquidityScore: number;
  };
  arbitrageOpportunities: ArbitrageOpportunity[];
  rebalanceRecommendations: RebalanceRecommendation[];
}
