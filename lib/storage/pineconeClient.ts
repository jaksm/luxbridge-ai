import { Pinecone } from "@pinecone-database/pinecone";
import { PlatformAsset, PlatformType } from "../types/platformAsset";
import { SemanticSearchParams } from "../types/schemas";

export class PineconeClient {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    this.indexName = process.env.PINECONE_INDEX_NAME || "luxbridge-assets";
  }

  async searchAssets(params: SemanticSearchParams): Promise<string[]> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      const filter: any = {};
      if (params.platform) {
        filter.platform = { $eq: params.platform };
      }

      const queryOptions: any = {
        vector: await this.generateEmbedding(params.query),
        topK: params.limit,
        includeMetadata: true,
      };

      // Only add filter if it has properties (Pinecone requires non-empty filter)
      if (Object.keys(filter).length > 0) {
        queryOptions.filter = filter;
      }

      const results = await index.query(queryOptions);

      return results.matches
        ?.filter(match => (match.score || 0) >= params.minScore)
        .map(match => match.metadata?.assetId as string)
        .filter(Boolean) || [];
    } catch (error) {
      console.error("Pinecone search error:", error);
      return [];
    }
  }

  async upsertAsset(asset: PlatformAsset, platform: PlatformType) {
    try {
      const index = this.pinecone.index(this.indexName);
      const embedding = await this.generateEmbedding(this.createAssetText(asset));
      
      await index.upsert([{
        id: `${platform}:${asset.assetId}`,
        values: embedding,
        metadata: {
          platform,
          assetId: asset.assetId,
          name: asset.name,
          category: asset.category,
          subcategory: asset.subcategory || "",
          riskCategory: asset.expertAnalysis.riskProfile.riskCategory,
          valueRange: this.getValueRange(asset.valuation.currentValue),
        },
      }]);
    } catch (error) {
      console.error("Pinecone upsert error:", error);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  private createAssetText(asset: PlatformAsset): string {
    return `# ${asset.name}

**Category**: ${asset.category} > ${asset.subcategory || 'N/A'}
**Asset ID**: ${asset.assetId}
**Investment Horizon**: ${asset.expertAnalysis.investmentHorizon.optimalYears} years
**Risk Profile**: ${asset.expertAnalysis.riskProfile.riskCategory} (${asset.expertAnalysis.riskProfile.overallRiskScore}/10)
**Expected Yield**: ${asset.expertAnalysis.yieldProjections.realisticAnnualYield}%
**Expert**: ${asset.expertAnalysis.expertProfile.verifyingExpert}

## Description
${asset.physicalAttributes.description}

## Risk Factors
${asset.expertAnalysis.riskProfile.riskFactors.join(', ')}

## Investment Thesis
${asset.expertAnalysis.expertProfile.trackRecord}`;
  }

  private getValueRange(value: number): string {
    if (value < 100000) return "0-100k";
    if (value < 500000) return "100k-500k";
    if (value < 1000000) return "500k-1m";
    if (value < 5000000) return "1m-5m";
    return "5m+";
  }
}
