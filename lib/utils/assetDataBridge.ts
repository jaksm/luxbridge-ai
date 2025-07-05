import { PlatformAsset } from "../types/platformAsset";
import { apiToContract, contractToApi, validateEssentialFields, type ContractApiMapping } from "../types/contractApiMapping";

/**
 * Asset Data Bridge - Handles synchronization between API rich data and blockchain essential data
 */
export class AssetDataBridge {
  
  /**
   * Prepare asset data for blockchain tokenization
   * Extracts essential fields and validates for contract storage
   */
  static prepareForTokenization(apiAsset: PlatformAsset): {
    contractData: any;
    offChainData: any;
    validationErrors: string[];
  } {
    // Validate essential fields first
    const validationErrors = validateEssentialFields(apiAsset);
    if (validationErrors.length > 0) {
      return {
        contractData: null,
        offChainData: null,
        validationErrors,
      };
    }

    // Transform API data to contract format
    const { essential, offChain } = apiToContract(apiAsset);

    // Format for smart contract input
    const contractData = {
      platform: "mock_platform", // Will be set by caller
      assetId: essential.assetId,
      totalSupply: essential.totalShares.toString(),
      assetType: essential.category,
      subcategory: essential.subcategory,
      legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000", // Mock legal hash
      valuation: essential.currentValue.toString(),
      sharePrice: essential.sharePrice.toString(),
      currency: essential.currency,
      
      // Extended fields for future use
      name: essential.name,
      description: essential.description,
      riskScore: essential.riskScore,
      riskCategory: essential.riskCategory,
      minimumInvestmentYears: essential.minimumInvestmentYears,
      conservativeYield: essential.conservativeYield,
      realisticYield: essential.realisticYield,
      optimisticYield: essential.optimisticYield,
      condition: essential.condition,
      valuationFrequency: essential.valuationFrequency,
    };

    return {
      contractData,
      offChainData: offChain,
      validationErrors: [],
    };
  }

  /**
   * Reconstruct full API asset from blockchain and off-chain data
   */
  static reconstructApiAsset(
    contractMetadata: any,
    offChainData: ContractApiMapping["offChainOnly"],
    timestamps: {
      createdAt: string;
      updatedAt: string;
      lastSyncedAt: string;
    }
  ): PlatformAsset {
    // Map contract data back to API format
    const essentialFields = {
      assetId: contractMetadata.assetId,
      name: contractMetadata.name || `Asset ${contractMetadata.assetId}`,
      category: contractMetadata.assetType,
      subcategory: contractMetadata.subcategory,
      currentValue: parseInt(contractMetadata.lastValuation),
      sharePrice: parseInt(contractMetadata.sharePrice),
      totalShares: parseInt(contractMetadata.totalSupply),
      availableShares: parseInt(contractMetadata.availableShares),
      currency: contractMetadata.currency,
      
      // Extended fields (if available)
      riskScore: contractMetadata.riskScore || 50,
      riskCategory: contractMetadata.riskCategory || "moderate",
      minimumInvestmentYears: contractMetadata.minimumInvestmentYears || 3,
      conservativeYield: contractMetadata.conservativeYield || 500, // 5% default
      realisticYield: contractMetadata.realisticYield || 700, // 7% default
      optimisticYield: contractMetadata.optimisticYield || 1000, // 10% default
      condition: contractMetadata.condition || "good",
      description: contractMetadata.description || "Asset description not available",
      valuationFrequency: contractMetadata.valuationFrequency || "quarterly",
    };

    return contractToApi(essentialFields, offChainData, timestamps);
  }

  /**
   * Sync contract data with latest API data
   * Returns update operations needed for blockchain
   */
  static calculateSyncUpdates(
    currentContractData: any,
    latestApiData: PlatformAsset
  ): {
    valuationUpdate?: {
      newValuation: string;
      newSharePrice: string;
    };
    metricsUpdate?: {
      conservativeYield: number;
      realisticYield: number;
      optimisticYield: number;
      riskScore: number;
    };
    noUpdatesNeeded?: boolean;
  } {
    const { essential } = apiToContract(latestApiData);
    const updates: any = {};

    // Check for valuation changes
    if (
      parseInt(currentContractData.lastValuation) !== essential.currentValue ||
      parseInt(currentContractData.sharePrice) !== essential.sharePrice
    ) {
      updates.valuationUpdate = {
        newValuation: essential.currentValue.toString(),
        newSharePrice: essential.sharePrice.toString(),
      };
    }

    // Check for metrics changes
    if (
      currentContractData.conservativeYield !== essential.conservativeYield ||
      currentContractData.realisticYield !== essential.realisticYield ||
      currentContractData.optimisticYield !== essential.optimisticYield ||
      currentContractData.riskScore !== essential.riskScore
    ) {
      updates.metricsUpdate = {
        conservativeYield: essential.conservativeYield,
        realisticYield: essential.realisticYield,
        optimisticYield: essential.optimisticYield,
        riskScore: essential.riskScore,
      };
    }

    if (Object.keys(updates).length === 0) {
      return { noUpdatesNeeded: true };
    }

    return updates;
  }

  /**
   * Generate mock off-chain data for testing
   */
  static generateMockOffChainData(assetType: string): ContractApiMapping["offChainOnly"] {
    const mockData: Record<string, ContractApiMapping["offChainOnly"]> = {
      wine: {
        expertAnalysis: {
          investmentHorizon: {
            rationale: "Fine wine appreciates over time with proper storage",
            liquidityExpectation: "Moderate liquidity through specialized wine exchanges",
          },
          riskProfile: {
            riskFactors: ["Weather conditions", "Market demand", "Storage costs"],
            mitigationStrategies: "Professional storage and insurance coverage",
          },
          yieldProjections: {
            yieldAssumptions: "Based on historical wine auction data",
            lastReviewDate: "2024-01-01",
          },
          expertProfile: {
            verifyingExpert: "Wine Investment Specialist",
            expertSpecialization: ["Fine Wine", "Bordeaux", "Investment Analytics"],
            trackRecord: "15 years in wine investment",
            performanceHistory: "Average 12% annual returns",
            certifications: ["Court of Master Sommeliers", "Wine Investment Certification"],
            yearsExperience: 15,
          },
        },
        physicalAttributes: {
          characteristics: "Premium vintage with excellent aging potential",
          provenance: "Direct from château with verified chain of custody",
        },
        metadata: {
          version: "1.0",
          dataSource: "mock-api",
        },
      },
      art: {
        expertAnalysis: {
          investmentHorizon: {
            rationale: "Contemporary art shows strong appreciation in current market",
            liquidityExpectation: "High liquidity through major auction houses",
          },
          riskProfile: {
            riskFactors: ["Market volatility", "Authentication risks", "Condition degradation"],
            mitigationStrategies: "Insurance, authentication, climate-controlled storage",
          },
          yieldProjections: {
            yieldAssumptions: "Based on contemporary art market analysis",
            lastReviewDate: "2024-01-01",
          },
          expertProfile: {
            verifyingExpert: "Contemporary Art Specialist",
            expertSpecialization: ["Contemporary Art", "Market Analysis", "Authentication"],
            trackRecord: "20 years in art investment",
            performanceHistory: "Average 15% annual returns",
            certifications: ["Art Appraisal Certification", "Market Analysis Certification"],
            yearsExperience: 20,
          },
        },
        physicalAttributes: {
          characteristics: "Museum-quality piece with strong market recognition",
          provenance: "Documented ownership history from artist",
        },
        metadata: {
          version: "1.0",
          dataSource: "mock-api",
        },
      },
      real_estate: {
        expertAnalysis: {
          investmentHorizon: {
            rationale: "Real estate provides stable income and appreciation",
            liquidityExpectation: "Moderate liquidity through tokenized shares",
          },
          riskProfile: {
            riskFactors: ["Market cycles", "Location factors", "Maintenance costs"],
            mitigationStrategies: "Professional property management and maintenance",
          },
          yieldProjections: {
            yieldAssumptions: "Based on rental income and market appreciation",
            lastReviewDate: "2024-01-01",
          },
          expertProfile: {
            verifyingExpert: "Real Estate Investment Specialist",
            expertSpecialization: ["Real Estate", "Property Management", "Market Analysis"],
            trackRecord: "25 years in real estate investment",
            performanceHistory: "Average 8% annual returns plus rental income",
            certifications: ["Real Estate License", "Property Management Certification"],
            yearsExperience: 25,
          },
        },
        physicalAttributes: {
          characteristics: "Well-maintained property in prime location",
          provenance: "Clear title with professional property management",
        },
        metadata: {
          version: "1.0",
          dataSource: "mock-api",
        },
      },
    };

    return mockData[assetType] || mockData.wine;
  }
}