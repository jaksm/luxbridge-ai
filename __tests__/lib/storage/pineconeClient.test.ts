import { describe, it, expect, beforeEach, vi } from "vitest";
import { PineconeClient } from "@/lib/storage/pineconeClient";
import { mockPineconeIndex } from "@/__tests__/setup";
import { createMockAsset } from "@/__tests__/fixtures/mockAssets";
import { mockFetchResponse } from "@/__tests__/utils/testHelpers";

describe("PineconeClient", () => {
  let pineconeClient: PineconeClient;

  beforeEach(() => {
    vi.clearAllMocks();
    pineconeClient = new PineconeClient();
  });

  describe("searchAssets", () => {
    it("should search assets with query", async () => {
      const mockMatches = [
        { 
          id: "splint_invest:WINE-BORDEAUX-001", 
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" }
        },
        { 
          id: "splint_invest:WINE-BURGUNDY-002", 
          score: 0.8,
          metadata: { assetId: "WINE-BURGUNDY-002" }
        }
      ];

      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });

      const result = await pineconeClient.searchAssets({
        query: "fine wine investment",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual(["WINE-BORDEAUX-001", "WINE-BURGUNDY-002"]);
      expect(mockPineconeIndex.query).toHaveBeenCalledWith({
        vector: expect.any(Array),
        filter: { platform: { $eq: "splint_invest" } },
        topK: 10,
        includeMetadata: true
      });
    });

    it("should filter by minimum score", async () => {
      const mockMatches = [
        { 
          id: "splint_invest:WINE-BORDEAUX-001", 
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" }
        },
        { 
          id: "splint_invest:WINE-BURGUNDY-002", 
          score: 0.05,
          metadata: { assetId: "WINE-BURGUNDY-002" }
        }
      ];

      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });

      const result = await pineconeClient.searchAssets({
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual(["WINE-BORDEAUX-001"]);
    });

    it("should search across all platforms when platform not specified", async () => {
      const mockMatches = [
        { 
          id: "splint_invest:WINE-BORDEAUX-001", 
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" }
        }
      ];

      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });

      const result = await pineconeClient.searchAssets({
        query: "investment",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual(["WINE-BORDEAUX-001"]);
      expect(mockPineconeIndex.query).toHaveBeenCalledWith({
        vector: expect.any(Array),
        topK: 10,
        includeMetadata: true
      });
    });

    it("should return empty array when no matches found", async () => {
      mockPineconeIndex.query.mockResolvedValue({ matches: [] });

      const result = await pineconeClient.searchAssets({
        query: "nonexistent",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual([]);
    });

    it("should handle Pinecone errors gracefully", async () => {
      mockPineconeIndex.query.mockRejectedValue(new Error("Pinecone error"));

      const result = await pineconeClient.searchAssets({
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual([]);
    });

    it("should handle missing metadata", async () => {
      const mockMatches = [
        { 
          id: "splint_invest:WINE-BORDEAUX-001", 
          score: 0.9,
          metadata: null
        },
        { 
          id: "splint_invest:WINE-BURGUNDY-002", 
          score: 0.8,
          metadata: { assetId: "WINE-BURGUNDY-002" }
        }
      ];

      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });

      const result = await pineconeClient.searchAssets({
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1
      });

      expect(result).toEqual(["WINE-BURGUNDY-002"]);
    });
  });

  describe("upsertAsset", () => {
    it("should upsert asset with embedding", async () => {
      const mockAsset = createMockAsset();
      mockPineconeIndex.upsert.mockResolvedValue({});

      await pineconeClient.upsertAsset(mockAsset, "splint_invest");

      expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([{
        id: "splint_invest:WINE-BORDEAUX-001",
        values: expect.any(Array),
        metadata: {
          platform: "splint_invest",
          assetId: "WINE-BORDEAUX-001",
          name: "2019 Château Margaux",
          category: "wine",
          subcategory: "bordeaux",
          riskCategory: "moderate",
          valueRange: "0-100k"
        }
      }]);
    });

    it("should handle subcategory absence", async () => {
      const mockAsset = createMockAsset({ subcategory: undefined });
      mockPineconeIndex.upsert.mockResolvedValue({});

      await pineconeClient.upsertAsset(mockAsset, "splint_invest");

      expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([
        expect.objectContaining({
          metadata: expect.objectContaining({
            subcategory: ""
          })
        })
      ]);
    });

    it("should categorize value ranges correctly", async () => {
      const testCases = [
        { value: 50000, expected: "0-100k" },
        { value: 250000, expected: "100k-500k" },
        { value: 750000, expected: "500k-1m" },
        { value: 2500000, expected: "1m-5m" },
        { value: 10000000, expected: "5m+" }
      ];

      for (const { value, expected } of testCases) {
        const mockAsset = createMockAsset({
          valuation: { ...createMockAsset().valuation, currentValue: value }
        });
        
        mockPineconeIndex.upsert.mockClear();
        await pineconeClient.upsertAsset(mockAsset, "splint_invest");

        expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([
          expect.objectContaining({
            metadata: expect.objectContaining({
              valueRange: expected
            })
          })
        ]);
      }
    });

    it("should handle upsert errors", async () => {
      const mockAsset = createMockAsset();
      mockPineconeIndex.upsert.mockRejectedValue(new Error("Upsert failed"));

      await expect(() => pineconeClient.upsertAsset(mockAsset, "splint_invest"))
        .not.toThrow();
    });
  });

  describe("generateEmbedding", () => {
    it("should generate embeddings via OpenAI API", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      global.fetch = vi.fn().mockResolvedValue(mockFetchResponse({
        data: [{ embedding: mockEmbedding }]
      }));

      const result = await (pineconeClient as any).generateEmbedding("test text");

      expect(result).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: "test text",
          }),
        }
      );
    });

    it("should handle OpenAI API errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("API error"));

      await expect((pineconeClient as any).generateEmbedding("test text"))
        .rejects.toThrow("API error");
    });
  });

  describe("createAssetText", () => {
    it("should create proper markdown text for asset", () => {
      const mockAsset = createMockAsset();
      
      const result = (pineconeClient as any).createAssetText(mockAsset);

      expect(result).toContain("# 2019 Château Margaux");
      expect(result).toContain("**Category**: wine > bordeaux");
      expect(result).toContain("**Asset ID**: WINE-BORDEAUX-001");
      expect(result).toContain("**Investment Horizon**: 7 years");
      expect(result).toContain("**Risk Profile**: moderate (6/10)");
      expect(result).toContain("**Expected Yield**: 12%");
      expect(result).toContain("**Expert**: Dr. Wine Expert");
      expect(result).toContain("## Description");
      expect(result).toContain("## Risk Factors");
      expect(result).toContain("## Investment Thesis");
    });

    it("should handle missing subcategory", () => {
      const mockAsset = createMockAsset({ subcategory: undefined });
      
      const result = (pineconeClient as any).createAssetText(mockAsset);

      expect(result).toContain("**Category**: wine > N/A");
    });
  });
});
  describe("searchAssets", () => {
    it("should search assets with query", async () => {
      const mockMatches = [
        {
          id: "splint_invest:WINE-BORDEAUX-001",
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" },
        },
        {
          id: "splint_invest:WINE-BURGUNDY-002",
          score: 0.8,
          metadata: { assetId: "WINE-BURGUNDY-002" },
        },
      ];
      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });
        query: "fine wine investment",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual(["WINE-BORDEAUX-001", "WINE-BURGUNDY-002"]);
        vector: expect.any(Array),
        filter: { platform: { $eq: "splint_invest" } },
        topK: 10,
        includeMetadata: true,
      });
    });
    it("should filter by minimum score", async () => {
      const mockMatches = [
        {
          id: "splint_invest:WINE-BORDEAUX-001",
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" },
        },
        {
          id: "splint_invest:WINE-BURGUNDY-002",
          score: 0.05,
          metadata: { assetId: "WINE-BURGUNDY-002" },
        },
      ];
      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual(["WINE-BORDEAUX-001"]);
    it("should search across all platforms when platform not specified", async () => {
      const mockMatches = [
        {
          id: "splint_invest:WINE-BORDEAUX-001",
          score: 0.9,
          metadata: { assetId: "WINE-BORDEAUX-001" },
        },
      ];
      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });
      const result = await pineconeClient.searchAssets({
        query: "investment",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual(["WINE-BORDEAUX-001"]);
      expect(mockPineconeIndex.query).toHaveBeenCalledWith({
        vector: expect.any(Array),
        topK: 10,
        includeMetadata: true,
      });
    });
        query: "nonexistent",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual([]);
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual([]);
    it("should handle missing metadata", async () => {
      const mockMatches = [
        {
          id: "splint_invest:WINE-BORDEAUX-001",
          score: 0.9,
          metadata: null,
        },
        {
          id: "splint_invest:WINE-BURGUNDY-002",
          score: 0.8,
          metadata: { assetId: "WINE-BURGUNDY-002" },
        },
      ];
      mockPineconeIndex.query.mockResolvedValue({ matches: mockMatches });
        query: "wine",
        platform: "splint_invest",
        limit: 10,
        minScore: 0.1,
      });
      expect(result).toEqual(["WINE-BURGUNDY-002"]);
      await pineconeClient.upsertAsset(mockAsset, "splint_invest");
      expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([
        {
          id: "splint_invest:WINE-BORDEAUX-001",
          values: expect.any(Array),
          metadata: {
            platform: "splint_invest",
            assetId: "WINE-BORDEAUX-001",
            name: "2019 Château Margaux",
            category: "wine",
            subcategory: "bordeaux",
            riskCategory: "moderate",
            valueRange: "0-100k",
          },
        },
      ]);
    });
    it("should handle subcategory absence", async () => {
      expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([
        expect.objectContaining({
          metadata: expect.objectContaining({
            subcategory: "",
          }),
        }),
      ]);
    });
        { value: 250000, expected: "100k-500k" },
        { value: 750000, expected: "500k-1m" },
        { value: 2500000, expected: "1m-5m" },
        { value: 10000000, expected: "5m+" },
      ];
      for (const { value, expected } of testCases) {
        const mockAsset = createMockAsset({
          valuation: { ...createMockAsset().valuation, currentValue: value },
        });

        mockPineconeIndex.upsert.mockClear();
        await pineconeClient.upsertAsset(mockAsset, "splint_invest");
        expect(mockPineconeIndex.upsert).toHaveBeenCalledWith([
          expect.objectContaining({
            metadata: expect.objectContaining({
              valueRange: expected,
            }),
          }),
        ]);
      }
    });
      const mockAsset = createMockAsset();
      mockPineconeIndex.upsert.mockRejectedValue(new Error("Upsert failed"));
      await expect(() =>
        pineconeClient.upsertAsset(mockAsset, "splint_invest"),
      ).not.toThrow();
    });
  });
  describe("generateEmbedding", () => {
    it("should generate embeddings via OpenAI API", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      global.fetch = vi.fn().mockResolvedValue(
        mockFetchResponse({
          data: [{ embedding: mockEmbedding }],
        }),
      );
      const result = await (pineconeClient as any).generateEmbedding(
        "test text",
      );
      expect(result).toEqual(mockEmbedding);
      expect(global.fetch).toHaveBeenCalledWith(
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: "test text",
          }),
        },
      );
    });
    it("should handle OpenAI API errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("API error"));
      await expect(
        (pineconeClient as any).generateEmbedding("test text"),
      ).rejects.toThrow("API error");
    });
  });
  describe("createAssetText", () => {
    it("should create proper markdown text for asset", () => {
      const mockAsset = createMockAsset();

      const result = (pineconeClient as any).createAssetText(mockAsset);
      expect(result).toContain("# 2019 Château Margaux");
    it("should handle missing subcategory", () => {
      const mockAsset = createMockAsset({ subcategory: undefined });

      const result = (pineconeClient as any).createAssetText(mockAsset);
      expect(result).toContain("**Category**: wine > N/A");
    });
  });
});
