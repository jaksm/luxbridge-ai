import { PlatformAsset } from "./platformAsset";

// Mapping between API rich data and blockchain essential data
export interface ContractApiMapping {
  // Direct mappings (API -> Contract)
  directMappings: {
    assetId: string; // API.assetId -> Contract.assetId
    name: string; // API.name -> Contract.name
    category: string; // API.category -> Contract.assetType
    subcategory: string; // API.subcategory -> Contract.subcategory
    currentValue: number; // API.valuation.currentValue -> Contract.lastValuation
    sharePrice: number; // API.valuation.sharePrice -> Contract.sharePrice
    totalShares: number; // API.valuation.totalShares -> Contract.totalSupply
    availableShares: number; // API.valuation.availableShares -> Contract.availableShares
    currency: string; // API.valuation.currency -> Contract.currency
  };

  // Computed mappings (API -> Contract calculations)
  computedMappings: {
    riskScore: number; // Computed from API.expertAnalysis.riskProfile.overallRiskScore
    riskCategory: string; // From API.expertAnalysis.riskProfile.riskCategory
    minimumInvestmentYears: number; // From API.expertAnalysis.investmentHorizon.minimumYears
    conservativeYield: number; // From API.expertAnalysis.yieldProjections.conservativeAnnualYield (to basis points)
    realisticYield: number; // From API.expertAnalysis.yieldProjections.realisticAnnualYield (to basis points)
    optimisticYield: number; // From API.expertAnalysis.yieldProjections.optimisticAnnualYield (to basis points)
    condition: string; // From API.physicalAttributes.condition
    description: string; // From API.physicalAttributes.description
    valuationFrequency: string; // From API.valuation.valuationFrequency
  };

  // Off-chain only (API data that stays in API/database)
  offChainOnly: {
    expertAnalysis: {
      investmentHorizon: {
        rationale: string;
        liquidityExpectation: string;
      };
      riskProfile: {
        riskFactors: string[];
        mitigationStrategies: string;
      };
      yieldProjections: {
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
      characteristics: string;
      provenance: string;
    };
    metadata: {
      version: string;
      dataSource: string;
    };
  };
}

// Transform API data to contract data
export function apiToContract(apiAsset: PlatformAsset): {
  essential: ContractApiMapping["directMappings"] &
    ContractApiMapping["computedMappings"];
  offChain: ContractApiMapping["offChainOnly"];
} {
  return {
    essential: {
      // Direct mappings
      assetId: apiAsset.assetId,
      name: apiAsset.name,
      category: apiAsset.category,
      subcategory: apiAsset.subcategory || "",
      currentValue: apiAsset.valuation.currentValue,
      sharePrice: apiAsset.valuation.sharePrice,
      totalShares: apiAsset.valuation.totalShares,
      availableShares: apiAsset.valuation.availableShares,
      currency: apiAsset.valuation.currency,

      // Computed mappings
      riskScore: apiAsset.expertAnalysis.riskProfile.overallRiskScore,
      riskCategory: apiAsset.expertAnalysis.riskProfile.riskCategory,
      minimumInvestmentYears:
        apiAsset.expertAnalysis.investmentHorizon.minimumYears,
      conservativeYield: Math.round(
        apiAsset.expertAnalysis.yieldProjections.conservativeAnnualYield * 100,
      ), // Convert to basis points
      realisticYield: Math.round(
        apiAsset.expertAnalysis.yieldProjections.realisticAnnualYield * 100,
      ),
      optimisticYield: Math.round(
        apiAsset.expertAnalysis.yieldProjections.optimisticAnnualYield * 100,
      ),
      condition: apiAsset.physicalAttributes.condition,
      description: apiAsset.physicalAttributes.description,
      valuationFrequency: apiAsset.valuation.valuationFrequency,
    },

    offChain: {
      expertAnalysis: {
        investmentHorizon: {
          rationale: apiAsset.expertAnalysis.investmentHorizon.rationale,
          liquidityExpectation:
            apiAsset.expertAnalysis.investmentHorizon.liquidityExpectation,
        },
        riskProfile: {
          riskFactors: apiAsset.expertAnalysis.riskProfile.riskFactors,
          mitigationStrategies:
            apiAsset.expertAnalysis.riskProfile.mitigationStrategies,
        },
        yieldProjections: {
          yieldAssumptions:
            apiAsset.expertAnalysis.yieldProjections.yieldAssumptions,
          lastReviewDate:
            apiAsset.expertAnalysis.yieldProjections.lastReviewDate,
        },
        expertProfile: apiAsset.expertAnalysis.expertProfile,
      },
      physicalAttributes: {
        characteristics: apiAsset.physicalAttributes.characteristics,
        provenance: apiAsset.physicalAttributes.provenance,
      },
      metadata: {
        version: apiAsset.metadata.version,
        dataSource: apiAsset.metadata.dataSource,
      },
    },
  };
}

// Transform contract data back to API format (for reads)
export function contractToApi(
  contractData: ContractApiMapping["directMappings"] &
    ContractApiMapping["computedMappings"],
  offChainData: ContractApiMapping["offChainOnly"],
  timestamps: { createdAt: string; updatedAt: string; lastSyncedAt: string },
): PlatformAsset {
  return {
    assetId: contractData.assetId,
    name: contractData.name,
    category: contractData.category,
    subcategory: contractData.subcategory,

    valuation: {
      currentValue: contractData.currentValue,
      sharePrice: contractData.sharePrice,
      totalShares: contractData.totalShares,
      availableShares: contractData.availableShares,
      currency: contractData.currency as any,
      lastValuationDate: timestamps.updatedAt,
      valuationFrequency: contractData.valuationFrequency as any,
    },

    expertAnalysis: {
      investmentHorizon: {
        minimumYears: contractData.minimumInvestmentYears,
        optimalYears: contractData.minimumInvestmentYears + 2, // Computed
        maximumYears: contractData.minimumInvestmentYears + 5, // Computed
        rationale: offChainData.expertAnalysis.investmentHorizon.rationale,
        liquidityExpectation:
          offChainData.expertAnalysis.investmentHorizon.liquidityExpectation,
      },
      riskProfile: {
        overallRiskScore: contractData.riskScore,
        riskCategory: contractData.riskCategory as any,
        returnCategory: "growth", // Default based on risk category
        riskFactors: offChainData.expertAnalysis.riskProfile.riskFactors,
        mitigationStrategies:
          offChainData.expertAnalysis.riskProfile.mitigationStrategies,
      },
      yieldProjections: {
        conservativeAnnualYield: contractData.conservativeYield / 100, // Convert from basis points
        realisticAnnualYield: contractData.realisticYield / 100,
        optimisticAnnualYield: contractData.optimisticYield / 100,
        yieldAssumptions:
          offChainData.expertAnalysis.yieldProjections.yieldAssumptions,
        lastReviewDate:
          offChainData.expertAnalysis.yieldProjections.lastReviewDate,
      },
      expertProfile: offChainData.expertAnalysis.expertProfile,
    },

    physicalAttributes: {
      description: contractData.description,
      characteristics: offChainData.physicalAttributes.characteristics,
      condition: contractData.condition,
      provenance: offChainData.physicalAttributes.provenance,
    },

    metadata: {
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
      version: offChainData.metadata.version,
      dataSource: offChainData.metadata.dataSource,
      lastSyncedAt: timestamps.lastSyncedAt,
    },
  };
}

// Validate essential blockchain fields
export function validateEssentialFields(apiAsset: PlatformAsset): string[] {
  const errors: string[] = [];

  if (!apiAsset.assetId) errors.push("assetId is required");
  if (!apiAsset.name) errors.push("name is required");
  if (!apiAsset.category) errors.push("category is required");
  if (apiAsset.valuation.currentValue <= 0)
    errors.push("currentValue must be positive");
  if (apiAsset.valuation.sharePrice <= 0)
    errors.push("sharePrice must be positive");
  if (apiAsset.valuation.totalShares <= 0)
    errors.push("totalShares must be positive");
  if (!apiAsset.valuation.currency) errors.push("currency is required");

  return errors;
}

// Calculate storage costs for different data storage strategies
export interface StorageCostAnalysis {
  fullOnChain: {
    estimatedGasCost: number;
    storageSlots: number;
    description: string;
  };
  hybridApproach: {
    onChainGasCost: number;
    offChainStorageMB: number;
    description: string;
  };
  minimalOnChain: {
    gasCost: number;
    ipfsStorageMB: number;
    description: string;
  };
}

export function analyzeStorageCosts(
  apiAsset: PlatformAsset,
): StorageCostAnalysis {
  const essentialData = apiToContract(apiAsset);

  // Rough gas cost estimates for different approaches
  return {
    fullOnChain: {
      estimatedGasCost: 500000, // Very expensive - full API data on-chain
      storageSlots: 25, // All fields stored on-chain
      description: "Store all API data on blockchain (not recommended)",
    },
    hybridApproach: {
      onChainGasCost: 150000, // Moderate cost - essential data only
      offChainStorageMB: 0.02, // Rich data in database/IPFS
      description:
        "Essential data on-chain, rich metadata off-chain (recommended)",
    },
    minimalOnChain: {
      gasCost: 80000, // Minimal cost - only critical fields
      ipfsStorageMB: 0.05, // All rich data on IPFS
      description: "Minimal on-chain data, everything else on IPFS",
    },
  };
}
