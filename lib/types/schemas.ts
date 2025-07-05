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
    "Parameters for retrieving user portfolio holdings from a specific platform",
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
    "Parameters for semantic search across RWA assets using natural language queries",
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

export type GetAssetParams = z.infer<typeof GetAssetSchema>;
export type GetAssetsByPlatformParams = z.infer<
  typeof GetAssetsByPlatformSchema
>;
export type GetUserPortfolioParams = z.infer<typeof GetUserPortfolioSchema>;
export type SemanticSearchParams = z.infer<typeof SemanticSearchSchema>;
export type AssetQueryParams = z.infer<typeof AssetQuerySchema>;
