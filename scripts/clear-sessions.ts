#!/usr/bin/env tsx

import { redis } from "@/lib/redis";

async function clearAllSessions() {
  console.log("🧹 Clearing all Redis sessions and OAuth data...");

  if (!redis.isReady) {
    console.log("🔌 Connecting to Redis...");
    await redis.connect();
  }

  try {
    const patterns = [
      "session:*",
      "oauth:token:*", 
      "oauth:authcode:*",
      "oauth:client:*",
      "user_sessions:*",
      "lux_user:*",
      "platform_link:*",
      "platform:*"
    ];

    let totalDeleted = 0;

    for (const pattern of patterns) {
      console.log(`\n🔍 Finding keys matching: ${pattern}`);
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        console.log(`📦 Found ${keys.length} keys to delete`);
        await redis.del(keys);
        totalDeleted += keys.length;
        console.log(`✅ Deleted ${keys.length} keys`);
      } else {
        console.log(`📭 No keys found for pattern: ${pattern}`);
      }
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${totalDeleted} total keys`);
    console.log("🔄 All sessions and OAuth tokens have been cleared");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log("👋 Disconnected from Redis");
  }
}

clearAllSessions();