import { config } from "dotenv";
config({ path: ".env.local" });

import { ChatOpenAI } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { readFileSync } from "fs";
import { join } from "path";
import { PlatformAssetSchema } from "../lib/types/platformAssetSchema";
import { PlatformType } from "../lib/types/platformAsset";
import { assetStorage } from "../lib/storage/redisClient";
import { PineconeClient } from "../lib/storage/pineconeClient";
import { getAllAssetIds } from "./generate-asset-ids";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHUNK_SIZE = 20;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const llm = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  apiKey: OPENAI_API_KEY,
});

const pineconeClient = new PineconeClient();

const outputParser = StructuredOutputParser.fromZodSchema(
  z.object({
    assets: z.array(PlatformAssetSchema),
  }),
);

function loadPrompt(platform: PlatformType): string {
  const promptPath = join(
    __dirname,
    "prompts",
    `${platform.replace("_", "-")}-prompt.md`,
  );
  return readFileSync(promptPath, "utf-8");
}

function createPromptTemplate(platform: PlatformType): PromptTemplate {
  const platformPrompt = loadPrompt(platform);

  const template = `${platformPrompt}

## Task
Generate exactly {assetCount} realistic {platform} assets using the provided asset IDs. Each asset must be authentic and market-realistic.

## Asset IDs to Generate
{assetIds}

## Requirements
- Use the exact asset IDs provided
- Generate realistic names based on the asset ID patterns
- Ensure all financial data is market-appropriate
- Include detailed expert analysis with proper specializations
- Physical attributes must match the asset type
- All dates should be recent and realistic
- Currency should match the platform's primary markets

## Output Format
Return a JSON object with an "assets" array containing all generated assets.

{format_instructions}

Generate the assets now:`;

  return PromptTemplate.fromTemplate(template);
}

async function generateAssetChunk(
  platform: PlatformType,
  assetIds: string[],
): Promise<any[]> {
  const prompt = createPromptTemplate(platform);

  const chain = prompt.pipe(llm).pipe(outputParser);

  try {
    const result = await chain.invoke({
      platform: platform.replace("_", " "),
      assetCount: assetIds.length,
      assetIds: assetIds.join("\n"),
      format_instructions: outputParser.getFormatInstructions(),
    });

    return result.assets;
  } catch (error) {
    console.error(`Error generating assets for ${platform}:`, error);
    throw error;
  }
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function generateAndStoreAssets(
  platform: PlatformType,
  assetIds: string[],
): Promise<void> {
  const chunks = chunkArray(assetIds, CHUNK_SIZE);

  console.log(
    `Generating ${assetIds.length} assets for ${platform} in ${chunks.length} chunks...`,
  );

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(
      `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} assets)...`,
    );

    try {
      const assets = await generateAssetChunk(platform, chunk);

      console.log(
        `Generated ${assets.length} assets, storing in Redis and Pinecone...`,
      );

      for (const asset of assets) {
        await assetStorage.storeAsset(asset, platform);

        try {
          await pineconeClient.upsertAsset(asset, platform);
        } catch (error) {
          console.error(
            `Failed to save asset ${asset.assetId} to Pinecone:`,
            error,
          );
        }
      }

      console.log(`✓ Chunk ${i + 1} completed successfully`);

      // Add delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        console.log("Waiting 2 seconds before next chunk...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`✗ Failed to process chunk ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(
    `✓ All ${assetIds.length} assets generated and stored for ${platform}`,
  );
}

async function main() {
  console.log("Starting platform asset generation...");

  const allAssetIds = getAllAssetIds();

  for (const [platform, assetIds] of Object.entries(allAssetIds) as [
    PlatformType,
    string[],
  ][]) {
    console.log(`\n=== Generating assets for ${platform} ===`);

    try {
      await generateAndStoreAssets(platform, assetIds);
    } catch (error) {
      console.error(`Failed to generate assets for ${platform}:`, error);
      process.exit(1);
    }
  }

  console.log("\n🎉 All platform assets generated successfully!");

  // Print summary
  console.log("\nSummary:");
  for (const [platform, assetIds] of Object.entries(allAssetIds)) {
    console.log(`  ${platform}: ${assetIds.length} assets`);
  }

  const totalAssets = Object.values(allAssetIds).reduce(
    (sum, ids) => sum + ids.length,
    0,
  );
  console.log(`  Total: ${totalAssets} assets`);
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateAssetChunk, generateAndStoreAssets };
