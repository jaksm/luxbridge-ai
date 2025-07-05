import { createMcpHandler } from "@vercel/mcp-adapter";
import { AccessToken } from "../redis-oauth";

export type ToolHandlerParams = {
  accessToken: AccessToken;
};

export type McpServer = Parameters<Parameters<typeof createMcpHandler>[0]>[0];

export type RegisterTool = (
  params: ToolHandlerParams,
) => (server: McpServer) => void;
