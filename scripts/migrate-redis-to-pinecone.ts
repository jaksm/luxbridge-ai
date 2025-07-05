import { config } from "dotenv";
config({ path: ".env.local" });

import { assetStorage } from "../lib/storage/redisClient";
import { PineconeClient } from "../lib/storage/pineconeClient";
import { PlatformType } from "../lib/types/platformAsset";

const CHUNK_SIZE = 50;
const PLATFORMS: PlatformType[] = ["splint_invest", "masterworks", "realt"];

const pineconeClient = new PineconeClient();

async function migrateAssetsForPlatform(platform: PlatformType): Promise<void> {
  console.log(`\n=== Migrating assets for ${platform} ===`);

  try {
    console.log(`Fetching all asset IDs for ${platform}...`);
    const assetIds = await assetStorage.getAllPlatformAssetIds(platform);

    if (assetIds.length === 0) {
      console.log(`No assets found for ${platform}`);
      return;
    }

    console.log(`Found ${assetIds.length} assets for ${platform}`);

    const chunks = chunkArray(assetIds, CHUNK_SIZE);
    let totalMigrated = 0;
    let totalFailed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `Processing chunk ${i + 1}/${chunks.length} (${chunk.length} assets)...`,
      );

      try {
        const assets = await assetStorage.getAssetsByIds(chunk, platform);

        for (const asset of assets) {
          try {
            await pineconeClient.upsertAsset(asset, platform);
            totalMigrated++;
          } catch (error) {
            console.error(`Failed to migrate asset ${asset.assetId}:`, error);
            totalFailed++;
          }
        }

        console.log(
          `✓ Chunk ${i + 1} completed (${assets.length} assets processed)`,
        );

        if (i < chunks.length - 1) {
          console.log("Waiting 1 second before next chunk...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`✗ Failed to process chunk ${i + 1}:`, error);
        totalFailed += chunk.length;
      }
    }

    console.log(`✓ Migration completed for ${platform}:`);
    console.log(`  Successfully migrated: ${totalMigrated} assets`);
    console.log(`  Failed: ${totalFailed} assets`);
  } catch (error) {
    console.error(`Failed to migrate assets for ${platform}:`, error);
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

async function main() {
  console.log("Starting Redis to Pinecone migration...");

  let totalMigrated = 0;
  let totalFailed = 0;

  for (const platform of PLATFORMS) {
    try {
      const beforeCount = totalMigrated;
      await migrateAssetsForPlatform(platform);
      console.log(`Platform ${platform} migration completed`);
    } catch (error) {
      console.error(`Platform ${platform} migration failed:`, error);
    }
  }

  console.log("\n🎉 Migration completed!");
  console.log("\nTo verify migration, you can:");
  console.log("1. Check your Pinecone dashboard for the uploaded vectors");
  console.log("2. Test semantic search functionality in your application");
}

if (require.main === module) {
  main().catch(console.error);
}

export { migrateAssetsForPlatform };
