import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const handler = createMcpHandler(
  async (server) => {
    server.tool(
      "echo",
      "description",
      {
        message: z.string(),
      },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }],
      })
    );
  },
  {
    capabilities: {
      tools: {
        echo: {
          description: "Echo a message",
        },
      },
    },
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 60,
  }
);

export { handler as GET, handler as POST, handler as DELETE };
import { authenticateRequest } from "@/lib/auth/authenticate-request";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest } from "next/server";
import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import { GetAssetSchema, GetAssetsByPlatformSchema, GetUserPortfolioSchema, SemanticSearchSchema } from "@/lib/types/schemas";
import { getUserById } from "@/lib/auth/authCommon";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";

const handler = async (req: Request) => {
  const nextReq = req as any as NextRequest;

  const accessToken = await authenticateRequest(nextReq);

  if (!accessToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "WWW-Authenticate": 'Bearer realm="oauth"',
      },
    });
  }

  return createMcpHandler(
    (server) => {
      server.tool(
        "get_auth_state",
        "Display current authentication state and user information",
        {},
        async () => {
          const result = {
            content: [
              {
                type: "text" as const,
                text: `✅ Authentication successful!\n\nAccess Token Info:\n${JSON.stringify(
                  {
                    userId: accessToken.userId,
                    clientId: accessToken.clientId,
                    expiresAt: accessToken.expiresAt,
                  },
                  null,
                  2,
                )}`,
              },
            ],
          };

          return result;
        },
      );

      server.tool(
        "get_asset",
        "Retrieve a specific asset from a RWA platform",
        GetAssetSchema.shape,
        async ({ platform, assetId }) => {
          try {
            const asset = await assetStorage.getAsset({ platform, assetId });
            if (!asset) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `Asset not found: ${assetId} on platform ${platform}`,
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(asset, null, 2),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error retrieving asset: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "get_assets_by_platform",
        "Retrieve all assets from a specific RWA platform",
        GetAssetsByPlatformSchema.shape,
        async ({ platform, limit = 50 }) => {
          try {
            const assets = await assetStorage.getAssetsByPlatform({ platform, limit });
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Found ${assets.length} assets on ${platform}:\n\n${JSON.stringify(assets, null, 2)}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error retrieving assets: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "get_user_portfolio",
        "Retrieve user portfolio holdings from a specific RWA platform",
        GetUserPortfolioSchema.shape,
        async ({ platform, userId }) => {
          try {
            const user = getUserById(userId);
            if (!user) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `User not found: ${userId}`,
                  },
                ],
              };
            }

            const holdings = user.portfolios[platform as keyof typeof user.portfolios];
            if (holdings.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `No holdings found for user ${userId} on platform ${platform}`,
                  },
                ],
              };
            }

            const constructedAssets = await constructUserPortfolio(holdings, platform);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Portfolio for ${userId} on ${platform}:\n\n${JSON.stringify(constructedAssets, null, 2)}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error retrieving portfolio: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "semantic_search",
        "Search for RWA assets using natural language queries",
        SemanticSearchSchema.shape,
        async ({ query, platform, limit = 10, minScore = 0.1 }) => {
          try {
            const semanticSearch = new SemanticAssetSearch();
            const assetIds = await semanticSearch.searchAssets({
              query,
              platform,
              limit,
              minScore,
            });

            if (assetIds.length === 0) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `No assets found matching query: "${query}"`,
                  },
                ],
              };
            }

            const assets = platform 
              ? await assetStorage.getAssetsByIds(assetIds, platform)
              : [];

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Found ${assets.length} assets matching "${query}":\n\n${JSON.stringify(assets, null, 2)}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error performing semantic search: ${error}`,
                },
              ],
            };
          }
        },
      );
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    },
    {
      basePath: "",
      redisUrl: process.env.REDIS_URL,
      verboseLogs: true,
      maxDuration: 60,
    },
  )(req);
};

export { handler as GET, handler as POST };

export async function OPTIONS() {
  const response = new Response(null, { status: 200 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}
import { NextRequest } from "next/server";
import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import {
  GetAssetSchema,
  GetAssetsByPlatformSchema,
  GetUserPortfolioSchema,
  SemanticSearchSchema,
} from "@/lib/types/schemas";
import { getUserById } from "@/lib/auth/authCommon";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
        GetAssetsByPlatformSchema.shape,
        async ({ platform, limit = 50 }) => {
          try {
            const assets = await assetStorage.getAssetsByPlatform({
              platform,
              limit,
            });
            return {
              content: [
                {
              };
            }
            const holdings =
              user.portfolios[platform as keyof typeof user.portfolios];
            if (holdings.length === 0) {
              return {
                content: [
              };
            }
            const constructedAssets = await constructUserPortfolio(
              holdings,
              platform,
            );
            return {
              content: [
                {
              };
            }
            const assets = platform
              ? await assetStorage.getAssetsByIds(assetIds, platform)
              : [];
