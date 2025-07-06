import { assetStorage } from "@/lib/storage/redisClient";
import { SemanticSearchSchema } from "@/lib/types/schemas";
import { SemanticAssetSearch } from "@/lib/utils/semanticSearch";
import { RegisterTool } from "./types";

const DESCRIPTION = `<description>
Search for RWA assets using natural language queries across platforms. Uses AI-powered semantic search to find assets matching investment criteria and preferences.

<use-cases>
- Investment search: query = "high yield wine investments", platform = "splint_invest", limit = 5
- Art discovery: query = "modern contemporary paintings", platform = "masterworks", minScore = 0.7
- Property search: query = "rental properties Detroit", platform = "realt", limit = 10
- Cross-platform: query = "luxury collectibles", platform = null (searches all platforms)
- Risk-based: query = "low risk stable returns", minScore = 0.6, limit = 15
</use-cases>

⚠️ IMPORTANT NOTES:

- Returns empty results if no assets match the semantic criteria
- Higher minScore values (0.7-1.0) return more precise matches
- Lower minScore values (0.1-0.3) return broader, more diverse results
- Platform parameter is optional - omit to search across all platforms

Essential for discovering RWA investment opportunities using natural language investment criteria.
</description>`;

export const registerSemanticSearchTool: RegisterTool =
  ({ accessToken }) =>
  (server) => {
    server.tool(
      "semantic_search",
      DESCRIPTION,
      SemanticSearchSchema.shape,
      async ({ query, platform, limit = 10, minScore = 0.1 }) => {
        // Mock comprehensive asset database for semantic search
        const allAssets = [
          // Splint Invest - Wine Assets
          {
            assetId: "WINE-BORDEAUX-001",
            platform: "splint_invest",
            name: "Château Margaux 2019",
            category: "wine",
            subcategory: "bordeaux",
            description: "Premium Bordeaux wine from prestigious Médoc region château",
            tags: ["luxury", "wine", "bordeaux", "investment", "premium", "french", "vintage"],
            expectedYield: 12.5,
            riskLevel: "moderate",
            semanticScore: 0.95,
            sharePrice: 85.00,
            availableShares: 342
          },
          {
            assetId: "WINE-BURGUNDY-002", 
            platform: "splint_invest",
            name: "Domaine de la Romanée-Conti 2020",
            category: "wine",
            subcategory: "burgundy",
            description: "Exceptional Burgundy from legendary vineyard",
            tags: ["luxury", "wine", "burgundy", "rare", "premium", "french", "vintage", "collectible"],
            expectedYield: 18.5,
            riskLevel: "high",
            semanticScore: 0.92,
            sharePrice: 215.00,
            availableShares: 127
          },
          {
            assetId: "WINE-CHAMPAGNE-003",
            platform: "splint_invest", 
            name: "Dom Pérignon 2012",
            category: "wine",
            subcategory: "champagne",
            description: "Prestigious champagne vintage from renowned maison",
            tags: ["luxury", "champagne", "french", "celebration", "premium", "vintage"],
            expectedYield: 8.2,
            riskLevel: "low",
            semanticScore: 0.88,
            sharePrice: 42.00,
            availableShares: 567
          },
          // Masterworks - Art Assets  
          {
            assetId: "MONET-WL-2023-004",
            platform: "masterworks",
            name: "Water Lilies Series - Nymphéas",
            category: "art",
            subcategory: "impressionist",
            description: "Masterpiece from Monet's renowned Water Lilies series",
            tags: ["art", "impressionist", "monet", "masterpiece", "museum-quality", "french", "modern"],
            expectedYield: 8.5,
            riskLevel: "moderate",
            semanticScore: 0.94,
            sharePrice: 450.00,
            availableShares: 2341
          },
          {
            assetId: "PICASSO-042",
            platform: "masterworks",
            name: "Femme au Béret Rouge",
            category: "art",
            subcategory: "modern",
            description: "Striking portrait from Picasso's mature period",
            tags: ["art", "picasso", "modern", "portrait", "spanish", "cubism", "masterpiece"],
            expectedYield: 11.2,
            riskLevel: "moderate", 
            semanticScore: 0.91,
            sharePrice: 620.00,
            availableShares: 1876
          },
          {
            assetId: "BASQUIAT-SK-001",
            platform: "masterworks",
            name: "Untitled (Skull)",
            category: "art",
            subcategory: "contemporary",
            description: "Iconic Basquiat skull painting from Neo-expressionist period",
            tags: ["art", "basquiat", "contemporary", "neo-expressionist", "american", "graffiti", "urban"],
            expectedYield: 15.8,
            riskLevel: "high",
            semanticScore: 0.87,
            sharePrice: 380.00,
            availableShares: 892
          },
          // RealT - Real Estate Assets
          {
            assetId: "DETROIT-HOUSE-789",
            platform: "realt",
            name: "1542 Riverside Dr, Detroit",
            category: "real_estate",
            subcategory: "residential",
            description: "Renovated single-family home in up-and-coming Detroit neighborhood",
            tags: ["real-estate", "residential", "detroit", "rental", "income", "property", "affordable"],
            expectedYield: 11.52,
            riskLevel: "moderate",
            semanticScore: 0.85,
            sharePrice: 12.50,
            availableShares: 3456
          },
          {
            assetId: "CHICAGO-001",
            platform: "realt",
            name: "2847 W Washington Blvd, Chicago",
            category: "real_estate", 
            subcategory: "residential",
            description: "Historic duplex in gentrifying West Town neighborhood",
            tags: ["real-estate", "duplex", "chicago", "historic", "rental", "income", "gentrification"],
            expectedYield: 9.97,
            riskLevel: "moderate",
            semanticScore: 0.83,
            sharePrice: 38.50,
            availableShares: 2178
          },
          {
            assetId: "MIAMI-CONDO-001",
            platform: "realt",
            name: "350 Ocean Dr, Miami Beach",
            category: "real_estate",
            subcategory: "luxury",
            description: "Oceanfront luxury condo in prime South Beach location",
            tags: ["real-estate", "luxury", "miami", "oceanfront", "vacation-rental", "high-end", "beach"],
            expectedYield: 7.8,
            riskLevel: "low",
            semanticScore: 0.89,
            sharePrice: 125.00,
            availableShares: 1200
          }
        ];

        // Perform semantic matching based on query
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/);
        
        let matchedAssets = allAssets.filter(asset => {
          // Filter by platform if specified
          if (platform && asset.platform !== platform) return false;
          
          // Calculate semantic relevance score
          let score = 0;
          
          // Direct matches in name/description
          if (asset.name.toLowerCase().includes(queryLower)) score += 0.4;
          if (asset.description.toLowerCase().includes(queryLower)) score += 0.3;
          
          // Tag matches
          const tagMatches = asset.tags.filter(tag => 
            queryTerms.some(term => tag.toLowerCase().includes(term))
          ).length;
          score += (tagMatches / asset.tags.length) * 0.5;
          
          // Category/subcategory matches
          if (queryTerms.some(term => asset.category.includes(term))) score += 0.3;
          if (queryTerms.some(term => asset.subcategory.includes(term))) score += 0.2;
          
          // Risk/yield semantic matching
          if (queryLower.includes("high yield") && asset.expectedYield > 15) score += 0.3;
          if (queryLower.includes("low risk") && asset.riskLevel === "low") score += 0.3;
          if (queryLower.includes("luxury") && asset.tags.includes("luxury")) score += 0.4;
          if (queryLower.includes("stable") && asset.riskLevel === "low") score += 0.3;
          if (queryLower.includes("income") && asset.category === "real_estate") score += 0.3;
          
          asset.semanticScore = score;
          return score >= minScore;
        });

        // Sort by relevance score
        matchedAssets.sort((a, b) => b.semanticScore - a.semanticScore);
        
        // Apply limit
        matchedAssets = matchedAssets.slice(0, limit);

        if (matchedAssets.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `🔍 **No Assets Found**\n\nQuery: "${query}"\nPlatform: ${platform || "All platforms"}\nMinimum Score: ${minScore}\n\n**Suggestions:**\n- Try broader search terms (e.g., "luxury", "wine", "art")\n- Lower the minimum score threshold\n- Remove platform filter to search across all platforms\n- Use different keywords like "high yield", "low risk", "collectible"\n\n**Popular Search Terms:**\n- "luxury wine investments" \n- "modern art masterpieces"\n- "rental property income"\n- "low risk stable returns"\n- "high yield collectibles"`,
              },
            ],
          };
        }

        // Generate search insights
        const platformCounts = matchedAssets.reduce((acc, asset) => {
          acc[asset.platform] = (acc[asset.platform] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const avgYield = matchedAssets.reduce((sum, asset) => sum + asset.expectedYield, 0) / matchedAssets.length;
        const totalAvailableValue = matchedAssets.reduce((sum, asset) => sum + (asset.sharePrice * asset.availableShares), 0);

        const insights = {
          platforms: Object.keys(platformCounts),
          avgExpectedYield: avgYield.toFixed(2),
          totalInvestmentOpportunity: totalAvailableValue.toLocaleString(),
          topMatch: matchedAssets[0],
          riskDistribution: {
            low: matchedAssets.filter(a => a.riskLevel === "low").length,
            moderate: matchedAssets.filter(a => a.riskLevel === "moderate").length,
            high: matchedAssets.filter(a => a.riskLevel === "high").length
          }
        };

        return {
          content: [
            {
              type: "text" as const,
              text: `🔍 **Semantic Search Results**\n\n**Query:** "${query}"\n**Found:** ${matchedAssets.length} matching assets\n**Platform(s):** ${platform || "All platforms"}\n**Min Score:** ${minScore}\n\n**Search Insights:**\n- Average Expected Yield: ${insights.avgExpectedYield}%\n- Total Investment Opportunity: $${insights.totalInvestmentOpportunity}\n- Platforms: ${insights.platforms.join(", ")}\n- Risk Distribution: ${insights.riskDistribution.low} low, ${insights.riskDistribution.moderate} moderate, ${insights.riskDistribution.high} high\n\n**Top Match:** ${insights.topMatch.name}\n- Platform: ${insights.topMatch.platform}\n- Expected Yield: ${insights.topMatch.expectedYield}%\n- Risk Level: ${insights.topMatch.riskLevel}\n- Relevance Score: ${insights.topMatch.semanticScore.toFixed(3)}\n- Available Investment: $${(insights.topMatch.sharePrice * insights.topMatch.availableShares).toLocaleString()}\n\n**All Matching Assets:**\n${matchedAssets.map((asset, i) => 
  `${i + 1}. **${asset.name}** (${asset.platform})\n   - Category: ${asset.category}\n   - Expected Yield: ${asset.expectedYield}%\n   - Risk: ${asset.riskLevel}\n   - Score: ${asset.semanticScore.toFixed(3)}\n   - Investment: $${asset.sharePrice} per share (${asset.availableShares.toLocaleString()} available)\n   - Tags: ${asset.tags.slice(0, 4).join(", ")}`
).join('\n\n')}\n\n**Investment Recommendations:**\n${matchedAssets.length > 0 ? 
  `- Consider diversifying across ${insights.platforms.length > 1 ? 'multiple platforms' : 'different asset types'}\n- Review risk tolerance vs expected yields\n- Start with smaller positions in higher-risk assets\n- Monitor performance and market conditions` :
  'Refine search criteria for better matches'}\n\n**Full Search Data:**\n${JSON.stringify({ query, results: matchedAssets, insights }, null, 2)}`,
            },
          ],
        };
      },
    );
  };
