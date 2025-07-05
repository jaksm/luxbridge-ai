import { PineconeClient } from "../storage/pineconeClient";
import { SemanticSearchParams } from "../types/schemas";

export class SemanticAssetSearch {
  private pineconeClient: PineconeClient;

  constructor() {
    this.pineconeClient = new PineconeClient();
  }

  async searchAssets(params: SemanticSearchParams): Promise<string[]> {
    return await this.pineconeClient.searchAssets(params);
  }

  async enhanceQuery(query: string): Promise<string> {
    const enhancedQuery = query
      .toLowerCase()
      .replace(/\b(invest|investment|investing)\b/g, "financial asset")
      .replace(/\b(wine|alcohol|beverage)\b/g, "wine collectible")
      .replace(/\b(art|artwork|painting)\b/g, "art collectible")
      .replace(/\b(real estate|property|building)\b/g, "real estate investment")
      .replace(/\b(low risk|safe|conservative)\b/g, "conservative risk profile")
      .replace(/\b(high risk|risky|aggressive)\b/g, "aggressive risk profile");

    return enhancedQuery;
  }

  async categorizeQuery(query: string): Promise<{
    category?: string;
    riskCategory?: string;
    valueRange?: string;
  }> {
    const lower = query.toLowerCase();
    const result: any = {};

    if (
      lower.includes("wine") ||
      lower.includes("bordeaux") ||
      lower.includes("vintage")
    ) {
      result.category = "wine";
    } else if (
      lower.includes("art") ||
      lower.includes("painting") ||
      lower.includes("sculpture")
    ) {
      result.category = "art";
    } else if (
      lower.includes("real estate") ||
      lower.includes("property") ||
      lower.includes("residential")
    ) {
      result.category = "real_estate";
    }

    if (
      lower.includes("conservative") ||
      lower.includes("safe") ||
      lower.includes("low risk")
    ) {
      result.riskCategory = "conservative";
    } else if (
      lower.includes("aggressive") ||
      lower.includes("high risk") ||
      lower.includes("risky")
    ) {
      result.riskCategory = "aggressive";
    } else if (lower.includes("moderate") || lower.includes("balanced")) {
      result.riskCategory = "moderate";
    }

    if (
      lower.includes("expensive") ||
      lower.includes("luxury") ||
      lower.includes("premium")
    ) {
      result.valueRange = "high";
    } else if (
      lower.includes("affordable") ||
      lower.includes("budget") ||
      lower.includes("cheap")
    ) {
      result.valueRange = "low";
    }

    return result;
  }
}
