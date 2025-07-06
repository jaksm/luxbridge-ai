#!/usr/bin/env tsx

import { getAllUsers } from "../lib/auth/redis-users";
import {
  createUserIdMapping,
  getUserIdMapping,
} from "../lib/auth/user-id-mapping";
import { getAllUserMappings } from "../lib/auth/user-id-mapping";

async function migrateUserMappings() {
  console.log("🔄 Starting user ID mapping migration...");

  try {
    // Get all existing Redis users
    const allUsers = await getAllUsers();
    console.log(`📊 Found ${allUsers.length} Redis users`);

    // Get all existing mappings
    const existingMappings = await getAllUserMappings();
    console.log(`📋 Found ${existingMappings.length} existing mappings`);

    let migratedCount = 0;
    let skippedCount = 0;

    // Create mappings for users that might be Privy-based
    for (const user of allUsers) {
      // Check if this user already has a mapping
      const existingMapping = existingMappings.find(
        (m) => m.redisUserId === user.userId || m.email === user.email,
      );

      if (existingMapping) {
        console.log(`⏭️  Skipping ${user.email} - mapping already exists`);
        skippedCount++;
        continue;
      }

      // For migration, we'll create a mapping using email as the "Privy ID"
      // This is for demo purposes - in production you'd have actual Privy DIDs
      const privyId = `migrated:${user.email}:${user.userId}`;

      try {
        await createUserIdMapping(privyId, user.userId, user.email);
        console.log(`✅ Created mapping for ${user.email} -> ${user.userId}`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to create mapping for ${user.email}:`, error);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   Users found: ${allUsers.length}`);
    console.log(`   Mappings created: ${migratedCount}`);
    console.log(`   Mappings skipped: ${skippedCount}`);
    console.log(
      `   Total mappings: ${existingMappings.length + migratedCount}`,
    );

    // Show all mappings
    const finalMappings = await getAllUserMappings();
    console.log(`\n📋 All User Mappings (${finalMappings.length}):`);
    for (const mapping of finalMappings) {
      console.log(
        `   ${mapping.privyUserId} -> ${mapping.redisUserId} (${mapping.email})`,
      );
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Create a special mapping for the failing user ID from the image
async function createSpecialMapping() {
  console.log("\n🎯 Creating special mapping for the failing user...");

  try {
    const privyId = "did:privy:cmcmp7udi00yqlb0mxvdbtcbq";
    const email = "jaksa.malisic@gmail.com";

    // Check if mapping already exists
    const existingMapping = await getUserIdMapping(privyId);
    if (existingMapping) {
      console.log(`⏭️  Mapping already exists for ${privyId}`);
      return;
    }

    // Try to find the user by email
    const { getUserByEmail } = await import("../lib/auth/redis-users");
    const user = await getUserByEmail(email);

    if (user) {
      await createUserIdMapping(privyId, user.userId, email);
      console.log(`✅ Created special mapping: ${privyId} -> ${user.userId}`);
    } else {
      console.log(`❌ User not found for email: ${email}`);
    }
  } catch (error) {
    console.error("❌ Failed to create special mapping:", error);
  }
}

if (require.main === module) {
  Promise.resolve()
    .then(() => migrateUserMappings())
    .then(() => createSpecialMapping())
    .then(() => {
      console.log("\n🚀 All migrations completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
