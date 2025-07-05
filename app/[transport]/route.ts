import { authenticateRequest } from "@/lib/auth/authenticate-request";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest } from "next/server";
import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import {
  GetAssetSchema,
  GetAssetsByPlatformSchema,
  GetUserPortfolioSchema,
  SemanticSearchSchema,
  AuthenticateLuxBridgeUserSchema,
  ListSupportedPlatformsSchema,
  GeneratePlatformAuthLinksSchema,
  GetLinkedPlatformsSchema,
  GetUserPortfolioCrossPlatformSchema,
  SearchAssetsCrossPlatformSchema,
} from "@/lib/types/schemas";
import { getUserById } from "@/lib/auth/authCommon";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
import { validatePrivyToken } from "@/lib/auth/privy-validation";
import {
  createAuthSession,
  getAuthSession,
  storeLuxBridgeUser,
  updateLuxBridgeUserActivity,
} from "@/lib/auth/session-manager";
import {
  SUPPORTED_PLATFORMS,
  getAllUserPlatformLinks,
  makeAuthenticatedPlatformCall,
} from "@/lib/auth/platform-auth";
import { PlatformType } from "@/lib/types/platformAsset";

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
            const assets = await assetStorage.getAssetsByPlatform({
              platform,
              limit,
            });
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

            const holdings =
              user.portfolios[platform as keyof typeof user.portfolios];
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

            const constructedAssets = await constructUserPortfolio(
              holdings,
              platform,
            );
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

      server.tool(
        "authenticate_luxbridge_user",
        "Authenticate user with LuxBridge using Privy token and establish MCP session",
        AuthenticateLuxBridgeUserSchema.shape,
        async ({ privyToken }) => {
          try {
            const luxUser = await validatePrivyToken(privyToken);
            if (!luxUser) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid Privy token. Please authenticate with Privy first.",
                  },
                ],
              };
            }

            await storeLuxBridgeUser(luxUser);
            const sessionId = await createAuthSession(
              luxUser.userId,
              privyToken,
            );

            return {
              content: [
                {
                  type: "text" as const,
                  text: `✅ LuxBridge authentication successful!\n\nSession ID: ${sessionId}\nUser: ${luxUser.name} (${luxUser.email})\nSession expires in 15 minutes\n\nYou can now link platform accounts and perform cross-platform operations.`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Authentication failed: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "list_supported_platforms",
        "Get list of RWA platforms supported by LuxBridge with connection status",
        ListSupportedPlatformsSchema.shape,
        async ({ sessionId }) => {
          try {
            const session = await getAuthSession(sessionId);
            if (!session) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid or expired session. Please authenticate first.",
                  },
                ],
              };
            }

            const platformStatus = SUPPORTED_PLATFORMS.map((platform) => {
              const link = session.platforms[platform.platform];
              return {
                platform: platform.platform,
                name: platform.name,
                description: platform.description,
                category: platform.category,
                isLinked: !!link,
                linkStatus: link?.status,
                lastUsed: link?.lastUsedAt,
              };
            });

            const linkedCount = platformStatus.filter((p) => p.isLinked).length;

            return {
              content: [
                {
                  type: "text" as const,
                  text: `📋 Supported RWA Platforms (${linkedCount}/${SUPPORTED_PLATFORMS.length} linked):\n\n${JSON.stringify(
                    {
                      platforms: platformStatus,
                      totalSupported: SUPPORTED_PLATFORMS.length,
                      linkedCount,
                    },
                    null,
                    2,
                  )}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Error listing platforms: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "generate_platform_auth_links",
        "Generate authentication links for specified platforms",
        GeneratePlatformAuthLinksSchema.shape,
        async ({ sessionId, platforms }) => {
          try {
            const session = await getAuthSession(sessionId);
            if (!session) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid or expired session. Please authenticate first.",
                  },
                ],
              };
            }

            const baseUrl =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            const expiresAt = new Date(
              Date.now() + 10 * 60 * 1000,
            ).toISOString(); // 10 minutes

            const authLinks = platforms.map((platform) => ({
              platform,
              authUrl: `${baseUrl}/auth/${platform.replace("_", "-")}?session=${sessionId}`,
              expiresAt,
              instructions: `Click the link to authenticate with ${SUPPORTED_PLATFORMS.find((p) => p.platform === platform)?.name || platform}`,
            }));

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔗 Platform Authentication Links:\n\n${JSON.stringify(
                    {
                      authLinks,
                      sessionExpiresAt: session.expiresAt,
                      instructions:
                        "Visit each link to authenticate with the respective platform. Links expire in 10 minutes.",
                    },
                    null,
                    2,
                  )}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Error generating auth links: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "get_linked_platforms",
        "Check status of linked platform accounts",
        GetLinkedPlatformsSchema.shape,
        async ({ sessionId }) => {
          try {
            const session = await getAuthSession(sessionId);
            if (!session) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid or expired session. Please authenticate first.",
                  },
                ],
              };
            }

            const linkedPlatforms = Object.entries(session.platforms)
              .filter(([_, link]) => link !== null)
              .map(([platform, link]) => ({
                platform: platform as PlatformType,
                status: link!.status,
                platformEmail: link!.platformEmail,
                linkedAt: link!.linkedAt,
                lastUsed: link!.lastUsedAt,
              }));

            const summary = {
              totalLinked: linkedPlatforms.length,
              activeCount: linkedPlatforms.filter((p) => p.status === "active")
                .length,
              expiredCount: linkedPlatforms.filter(
                (p) => p.status === "expired",
              ).length,
            };

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔗 Linked Platform Accounts:\n\n${JSON.stringify(
                    { linkedPlatforms, summary },
                    null,
                    2,
                  )}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Error getting linked platforms: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "get_user_portfolio_cross_platform",
        "Retrieve user portfolio from specified platform using stored credentials",
        GetUserPortfolioCrossPlatformSchema.shape,
        async ({ sessionId, platform }) => {
          try {
            const session = await getAuthSession(sessionId);
            if (!session) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid or expired session. Please authenticate first.",
                  },
                ],
              };
            }

            const platformLink = session.platforms[platform];
            if (!platformLink || platformLink.status !== "active") {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: `❌ Platform ${platform} not linked or inactive. Please link your account first.`,
                  },
                ],
              };
            }

            const portfolio = await makeAuthenticatedPlatformCall(
              sessionId,
              platform,
              "/portfolio",
            );

            const response = {
              platform,
              portfolio,
              metadata: {
                retrievedAt: new Date().toISOString(),
                platformUserId: platformLink.platformUserId,
                credentialStatus: platformLink.status,
              },
            };

            return {
              content: [
                {
                  type: "text" as const,
                  text: `📊 Portfolio from ${platform}:\n\n${JSON.stringify(response, null, 2)}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Error retrieving portfolio: ${error}`,
                },
              ],
            };
          }
        },
      );

      server.tool(
        "search_assets_cross_platform",
        "Search for assets across linked platforms using stored credentials",
        SearchAssetsCrossPlatformSchema.shape,
        async ({ sessionId, platforms, semanticQuery, limit = 10 }) => {
          try {
            const session = await getAuthSession(sessionId);
            if (!session) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "❌ Invalid or expired session. Please authenticate first.",
                  },
                ],
              };
            }

            const searchStartTime = Date.now();
            const targetPlatforms =
              platforms ||
              (["splint_invest", "masterworks", "realt"] as PlatformType[]);
            const results = [];

            let totalResults = 0;
            let platformsSearched = 0;

            for (const platform of targetPlatforms) {
              const platformLink = session.platforms[platform];
              if (!platformLink || platformLink.status !== "active") {
                continue;
              }

              try {
                const searchResponse = await makeAuthenticatedPlatformCall(
                  sessionId,
                  platform,
                  `/assets?semanticSearch=${encodeURIComponent(semanticQuery)}&limit=${limit}`,
                );

                const assets = searchResponse.assets || [];
                results.push({
                  platform,
                  assets,
                  resultCount: assets.length,
                  credentialStatus: platformLink.status,
                });

                totalResults += assets.length;
                platformsSearched += 1;
              } catch (error) {
                results.push({
                  platform,
                  assets: [],
                  resultCount: 0,
                  credentialStatus: "invalid",
                });
              }
            }

            const searchTimeMs = Date.now() - searchStartTime;

            const response = {
              results,
              summary: {
                totalResults,
                platformsSearched,
                searchTimeMs,
              },
            };

            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔍 Cross-platform search results for "${semanticQuery}":\n\n${JSON.stringify(response, null, 2)}`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ Error performing cross-platform search: ${error}`,
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
