import { getUserById } from "@/lib/auth/authCommon";
import { loadMarkdownTemplate } from "@/lib/markdown-template";
import { GetUserPortfolioSchema } from "@/lib/types/schemas";
import { constructUserPortfolio } from "@/lib/utils/portfolioCalculator";
import { RegisterTool } from "./types";

const DESCRIPTION = loadMarkdownTemplate(
  "lib/tools/templates/get-user-portfolio-tool-description.md",
  {},
);

export const registerGetUserPortfolioTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "get_user_portfolio",
      DESCRIPTION,
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
  };
