import { authenticateRequest } from "@/lib/auth/authenticate-request";
import { registerGeneratePlatformAuthLinksTool } from "@/lib/tools/generate-platform-auth-links-tool";
import { registerGetAssetTool } from "@/lib/tools/get-asset-tool";
import { registerGetAssetsByPlatformTool } from "@/lib/tools/get-assets-by-platform-tool";
import { registerGetAuthStateTool } from "@/lib/tools/get-auth-state-tool";
import { registerGetLinkedPlatformsTool } from "@/lib/tools/get-linked-platforms-tool";
import { registerGetPortfolioTool } from "@/lib/tools/get-portfolio-tool";
import { registerGetUserPortfolioTool } from "@/lib/tools/get-user-portfolio-tool";
import { registerListSupportedPlatformsTool } from "@/lib/tools/list-supported-platforms-tool";
import { registerSearchAssetsTool } from "@/lib/tools/search-assets-tool";
import { registerSemanticSearchTool } from "@/lib/tools/semantic-search-tool";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { NextRequest } from "next/server";

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
      registerGetAuthStateTool({ accessToken })(server);
      registerGetAssetTool({ accessToken })(server);
      registerGetAssetsByPlatformTool({ accessToken })(server);
      registerGetUserPortfolioTool({ accessToken })(server);
      registerSemanticSearchTool({ accessToken })(server);
      registerListSupportedPlatformsTool({ accessToken })(server);
      registerGeneratePlatformAuthLinksTool({ accessToken })(server);
      registerGetLinkedPlatformsTool({ accessToken })(server);
      registerGetPortfolioTool({ accessToken })(server);
      registerSearchAssetsTool({ accessToken })(server);
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
