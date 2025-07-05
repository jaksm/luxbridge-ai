import { z } from "zod";

export const PlatformAssetSchema = z.object({
  assetId: z.string().describe("Unique identifier for the asset, following platform-specific naming conventions"),
  
  name: z.string().describe("Human-readable name of the asset (e.g., '1982 Château Latour', 'Picasso - Les Demoiselles d'Avignon', '5942 Wayburn Street')"),
  
  category: z.string().describe("Primary asset category (e.g., 'wine', 'art', 'real_estate', 'collectibles', 'whisky')"),
  
  subcategory: z.string().optional().describe("More specific asset subcategory (e.g., 'bordeaux_red', 'impressionist_painting', 'single_family_home')"),

  valuation: z.object({
    currentValue: z.number().describe("Current total valuation of the asset in the specified currency"),
    
    sharePrice: z.number().describe("Price per share/token for fractional ownership"),
    
    totalShares: z.number().describe("Total number of shares/tokens representing the asset"),
    
    availableShares: z.number().describe("Number of shares currently available for purchase"),
    
    currency: z.enum(["USD", "EUR", "GBP", "CHF"]).describe("Currency code for all monetary values"),
    
    lastValuationDate: z.string().describe("ISO date string of the most recent valuation"),
    
    valuationFrequency: z.enum(["monthly", "quarterly", "annual"]).describe("How often the asset is professionally revalued")
  }).describe("Complete valuation information including pricing and share structure"),

  expertAnalysis: z.object({
    investmentHorizon: z.object({
      minimumYears: z.number().describe("Minimum recommended holding period in years"),
      
      optimalYears: z.number().describe("Optimal holding period for maximum returns"),
      
      maximumYears: z.number().describe("Maximum practical holding period"),
      
      rationale: z.string().describe("Detailed explanation of the investment timeline reasoning"),
      
      liquidityExpectation: z.string().describe("Expected ease and timeline for selling the asset")
    }).describe("Investment time horizon analysis with liquidity considerations"),

    riskProfile: z.object({
      overallRiskScore: z.number().min(1).max(10).describe("Risk score from 1 (very low risk) to 10 (very high risk)"),
      
      riskCategory: z.enum(["conservative", "moderate", "aggressive", "speculative"]).describe("Risk classification category"),
      
      returnCategory: z.enum(["stable", "growth", "high_growth", "speculative"]).describe("Expected return pattern category"),
      
      riskFactors: z.array(z.string()).describe("Array of specific risk factors affecting this asset"),
      
      mitigationStrategies: z.string().describe("Recommended strategies to mitigate identified risks")
    }).describe("Comprehensive risk assessment and mitigation analysis"),

    yieldProjections: z.object({
      conservativeAnnualYield: z.number().describe("Conservative annual yield projection as a percentage"),
      
      realisticAnnualYield: z.number().describe("Realistic/expected annual yield projection as a percentage"),
      
      optimisticAnnualYield: z.number().describe("Optimistic annual yield projection as a percentage"),
      
      yieldAssumptions: z.string().describe("Key assumptions underlying the yield projections"),
      
      lastReviewDate: z.string().describe("ISO date string of the last yield projection review")
    }).describe("Yield projections with conservative, realistic, and optimistic scenarios"),

    expertProfile: z.object({
      verifyingExpert: z.string().describe("Name of the expert who verified this analysis"),
      
      expertSpecialization: z.array(z.string()).describe("Array of expert's specialization areas"),
      
      trackRecord: z.string().describe("Brief description of the expert's track record"),
      
      performanceHistory: z.string().describe("Expert's historical performance in similar assets"),
      
      certifications: z.array(z.string()).describe("Array of relevant professional certifications"),
      
      yearsExperience: z.number().describe("Years of experience in the relevant field")
    }).describe("Profile of the expert providing the investment analysis")
  }).describe("Complete expert investment analysis including risk, yield, and expert credentials"),

  physicalAttributes: z.object({
    description: z.string().describe("Detailed physical description of the asset"),
    
    characteristics: z.string().describe("Key physical characteristics that affect value"),
    
    condition: z.string().describe("Current condition assessment of the asset"),
    
    provenance: z.string().describe("Historical ownership and authentication information")
  }).describe("Physical attributes and condition information for the tangible asset"),

  metadata: z.object({
    createdAt: z.string().describe("ISO date string when the asset record was created"),
    
    updatedAt: z.string().describe("ISO date string when the asset record was last updated"),
    
    version: z.string().describe("Version number of the asset record for tracking changes"),
    
    dataSource: z.string().describe("Source of the asset data (e.g., platform API, manual entry)"),
    
    lastSyncedAt: z.string().describe("ISO date string when the asset was last synchronized with the platform")
  }).describe("Metadata for tracking asset record lifecycle and data synchronization")
});

export type PlatformAssetType = z.infer<typeof PlatformAssetSchema>;