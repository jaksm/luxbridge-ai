import { PlatformAsset, PlatformType } from "@/lib/types/platformAsset";

export const createMockAsset = (overrides: Partial<PlatformAsset> = {}): PlatformAsset => ({
  assetId: "WINE-BORDEAUX-001",
  name: "2019 Château Margaux",
  category: "wine",
  subcategory: "bordeaux",
  valuation: {
    currentValue: 50000,
    sharePrice: 100,
    totalShares: 500,
    availableShares: 250,
    currency: "USD",
    lastValuationDate: "2024-01-15T00:00:00Z",
    valuationFrequency: "quarterly"
  },
  expertAnalysis: {
    investmentHorizon: {
      minimumYears: 3,
      optimalYears: 7,
      maximumYears: 15,
      rationale: "Wine requires time to appreciate and develop complexity",
      liquidityExpectation: "Limited liquidity expected during holding period"
    },
    riskProfile: {
      overallRiskScore: 6,
      riskCategory: "moderate",
      returnCategory: "growth",
      riskFactors: ["Market volatility", "Storage conditions", "Authentication"],
      mitigationStrategies: "Professional storage and insurance coverage"
    },
    yieldProjections: {
      conservativeAnnualYield: 8,
      realisticAnnualYield: 12,
      optimisticAnnualYield: 18,
      yieldAssumptions: "Based on historical Bordeaux performance",
      lastReviewDate: "2024-01-01T00:00:00Z"
    },
    expertProfile: {
      verifyingExpert: "Dr. Wine Expert",
      expertSpecialization: ["Fine Wine", "Bordeaux"],
      trackRecord: "20 years wine investment experience",
      performanceHistory: "15% average annual returns",
      certifications: ["Master of Wine", "WSET Level 4"],
      yearsExperience: 20
    }
  },
  physicalAttributes: {
    description: "Premium Bordeaux first growth from exceptional vintage",
    characteristics: "Full-bodied, complex tannins, exceptional aging potential",
    condition: "Perfect storage conditions maintained",
    provenance: "Direct from château, verified authenticity"
  },
  metadata: {
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    version: "1.0",
    dataSource: "splint_invest",
    lastSyncedAt: "2024-01-15T00:00:00Z"
  },
  ...overrides
});

export const mockAssets: Record<PlatformType, PlatformAsset[]> = {
  splint_invest: [
    createMockAsset(),
    createMockAsset({
      assetId: "WINE-BURGUNDY-002",
      name: "2020 Domaine de la Romanée-Conti",
      subcategory: "burgundy",
      valuation: { ...createMockAsset().valuation, currentValue: 75000, sharePrice: 150 }
    }),
    createMockAsset({
      assetId: "ART-CONTEMP-001",
      name: "Banksy Original Print",
      category: "art",
      subcategory: "contemporary",
      valuation: { ...createMockAsset().valuation, currentValue: 30000, sharePrice: 60 }
    })
  ],
  masterworks: [
    createMockAsset({
      assetId: "ART-MODERN-001",
      name: "Basquiat Painting",
      category: "art",
      subcategory: "modern",
      valuation: { ...createMockAsset().valuation, currentValue: 500000, sharePrice: 1000 }
    }),
    createMockAsset({
      assetId: "ART-CLASSIC-001",
      name: "Picasso Lithograph",
      category: "art",
      subcategory: "classic",
      valuation: { ...createMockAsset().valuation, currentValue: 150000, sharePrice: 300 }
    })
  ],
  realt: [
    createMockAsset({
      assetId: "RE-RESIDENTIAL-001",
      name: "Miami Beach Condo",
      category: "real_estate",
      subcategory: "residential",
      valuation: { ...createMockAsset().valuation, currentValue: 800000, sharePrice: 1600 }
    }),
    createMockAsset({
      assetId: "RE-COMMERCIAL-001",
      name: "Downtown Office Building",
      category: "real_estate",
      subcategory: "commercial",
      valuation: { ...createMockAsset().valuation, currentValue: 2000000, sharePrice: 4000 }
    })
  ]
};

export const mockAssetNotFound = {
  assetId: "NONEXISTENT-001",
  platform: "splint_invest" as PlatformType
};
import { PlatformAsset, PlatformType } from "@/lib/types/platformAsset";
export const createMockAsset = (
  overrides: Partial<PlatformAsset> = {},
): PlatformAsset => ({
  assetId: "WINE-BORDEAUX-001",
  name: "2019 Château Margaux",
  category: "wine",
    availableShares: 250,
    currency: "USD",
    lastValuationDate: "2024-01-15T00:00:00Z",
    valuationFrequency: "quarterly",
  },
  expertAnalysis: {
    investmentHorizon: {
      optimalYears: 7,
      maximumYears: 15,
      rationale: "Wine requires time to appreciate and develop complexity",
      liquidityExpectation: "Limited liquidity expected during holding period",
    },
    riskProfile: {
      overallRiskScore: 6,
      riskCategory: "moderate",
      returnCategory: "growth",
      riskFactors: [
        "Market volatility",
        "Storage conditions",
        "Authentication",
      ],
      mitigationStrategies: "Professional storage and insurance coverage",
    },
    yieldProjections: {
      conservativeAnnualYield: 8,
      realisticAnnualYield: 12,
      optimisticAnnualYield: 18,
      yieldAssumptions: "Based on historical Bordeaux performance",
      lastReviewDate: "2024-01-01T00:00:00Z",
    },
    expertProfile: {
      verifyingExpert: "Dr. Wine Expert",
      trackRecord: "20 years wine investment experience",
      performanceHistory: "15% average annual returns",
      certifications: ["Master of Wine", "WSET Level 4"],
      yearsExperience: 20,
    },
  },
  physicalAttributes: {
    description: "Premium Bordeaux first growth from exceptional vintage",
    characteristics:
      "Full-bodied, complex tannins, exceptional aging potential",
    condition: "Perfect storage conditions maintained",
    provenance: "Direct from château, verified authenticity",
  },
  metadata: {
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-15T00:00:00Z",
    version: "1.0",
    dataSource: "splint_invest",
    lastSyncedAt: "2024-01-15T00:00:00Z",
  },
  ...overrides,
});
export const mockAssets: Record<PlatformType, PlatformAsset[]> = {
      assetId: "WINE-BURGUNDY-002",
      name: "2020 Domaine de la Romanée-Conti",
      subcategory: "burgundy",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 75000,
        sharePrice: 150,
      },
    }),
    createMockAsset({
      assetId: "ART-CONTEMP-001",
      name: "Banksy Original Print",
      category: "art",
      subcategory: "contemporary",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 30000,
        sharePrice: 60,
      },
    }),
  ],
  masterworks: [
    createMockAsset({
      name: "Basquiat Painting",
      category: "art",
      subcategory: "modern",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 500000,
        sharePrice: 1000,
      },
    }),
    createMockAsset({
      assetId: "ART-CLASSIC-001",
      name: "Picasso Lithograph",
      category: "art",
      subcategory: "classic",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 150000,
        sharePrice: 300,
      },
    }),
  ],
  realt: [
    createMockAsset({
      name: "Miami Beach Condo",
      category: "real_estate",
      subcategory: "residential",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 800000,
        sharePrice: 1600,
      },
    }),
    createMockAsset({
      assetId: "RE-COMMERCIAL-001",
      name: "Downtown Office Building",
      category: "real_estate",
      subcategory: "commercial",
      valuation: {
        ...createMockAsset().valuation,
        currentValue: 2000000,
        sharePrice: 4000,
      },
    }),
  ],
};
export const mockAssetNotFound = {
  assetId: "NONEXISTENT-001",
  platform: "splint_invest" as PlatformType,
};
