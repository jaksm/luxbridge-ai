import { z } from "zod";

export const GetAssetSchema = z
  .object({
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("The RWA platform (splint_invest, masterworks, or realt)"),
    assetId: z.string().describe("Unique asset identifier within the platform"),
  })
  .describe("Parameters for retrieving a specific asset from a platform");

export const GetAssetsByPlatformSchema = z
  .object({
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("The RWA platform to search within"),
    limit: z
      .number()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe("Maximum number of assets to return (1-200, default: 50)"),
  })
  .describe("Parameters for retrieving all assets from a specific platform");

export const GetUserPortfolioSchema = z
  .object({
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("The RWA platform for the user portfolio"),
    userId: z.string().describe("Unique user identifier for portfolio lookup"),
  })
  .describe(
    "Parameters for retrieving user portfolio holdings from a specific platform"
  );

export const SemanticSearchSchema = z
  .object({
    query: z
      .string()
      .describe("Natural language search query for finding relevant assets"),
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .optional()
      .describe("Optional platform filter to search within specific platform"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum number of results to return (1-50, default: 10)"),
    minScore: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.1)
      .describe("Minimum relevance score threshold (0.0-1.0, default: 0.1)"),
  })
  .describe(
    "Parameters for semantic search across RWA assets using natural language queries"
  );

export const AssetQuerySchema = z.object({
  semanticSearch: z.string().optional().describe("Semantic search query"),
  category: z
    .string()
    .optional()
    .describe("Filter by category (e.g., wine, art)"),
  limit: z
    .number()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe("Maximum number of assets to return"),
  minValue: z.number().optional().describe("Minimum asset value"),
  maxValue: z.number().optional().describe("Maximum asset value"),
  riskCategory: z
    .enum(["conservative", "moderate", "aggressive", "speculative"])
    .optional()
    .describe("Risk category filter"),
});

export const AuthenticateLuxBridgeUserSchema = z
  .object({
    privyToken: z.string().describe("Privy authentication token from user login"),
  })
  .describe("Parameters for authenticating user with LuxBridge using Privy token");

export const ListSupportedPlatformsSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
  })
  .describe("Parameters for listing supported RWA platforms with connection status");

export const GeneratePlatformAuthLinksSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
    platforms: z
      .array(z.enum(["splint_invest", "masterworks", "realt"]))
      .describe("List of platforms to generate auth links for"),
  })
  .describe("Parameters for generating authentication links for specified platforms");

export const GetLinkedPlatformsSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
  })
  .describe("Parameters for checking status of linked platform accounts");

export const GetUserPortfolioCrossPlatformSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
    platform: z
      .enum(["splint_invest", "masterworks", "realt"])
      .describe("Platform to retrieve portfolio from"),
  })
  .describe("Parameters for retrieving user portfolio from platform using stored credentials");

export const SearchAssetsCrossPlatformSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
    platforms: z
      .array(z.enum(["splint_invest", "masterworks", "realt"]))
      .optional()
      .describe("Platforms to search (only linked platforms will be queried)"),
    semanticQuery: z.string().describe("Natural language search query"),
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Maximum results per platform"),
  })
  .describe("Parameters for searching assets across linked platforms using stored credentials");

export const PlatformCredentialsSchema = z
  .object({
    sessionId: z.string().describe("Active LuxBridge session ID"),
    email: z.string().email().describe("Platform account email"),
    password: z.string().describe("Platform account password"),
  })
  .describe("Platform authentication credentials");

export type GetAssetParams = z.infer<typeof GetAssetSchema>;
export type GetAssetsByPlatformParams = z.infer<
  typeof GetAssetsByPlatformSchema
>;
export type GetUserPortfolioParams = z.infer<typeof GetUserPortfolioSchema>;
export type SemanticSearchParams = z.infer<typeof SemanticSearchSchema>;
export type AssetQueryParams = z.infer<typeof AssetQuerySchema>;
export type AuthenticateLuxBridgeUserParams = z.infer<typeof AuthenticateLuxBridgeUserSchema>;
export type ListSupportedPlatformsParams = z.infer<typeof ListSupportedPlatformsSchema>;
export type GeneratePlatformAuthLinksParams = z.infer<typeof GeneratePlatformAuthLinksSchema>;
export type GetLinkedPlatformsParams = z.infer<typeof GetLinkedPlatformsSchema>;
export type GetUserPortfolioCrossPlatformParams = z.infer<typeof GetUserPortfolioCrossPlatformSchema>;
export type SearchAssetsCrossPlatformParams = z.infer<typeof SearchAssetsCrossPlatformSchema>;
export type PlatformCredentialsParams = z.infer<typeof PlatformCredentialsSchema>;
