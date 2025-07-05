#!/usr/bin/env tsx

import { redis } from "@/lib/redis";

async function clearAllSessions() {
  console.log(
    "🧹 Clearing Redis sessions and OAuth tokens (preserving client registrations)..."
  );

  if (!redis.isReady) {
    console.log("🔌 Connecting to Redis...");
    await redis.connect();
  }

  try {
    const patterns = [
      "session:*",
      "oauth:token:*",
      "oauth:authcode:*",
      "user_sessions:*",
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
    console.log(
      "🔄 Sessions and OAuth tokens cleared (client registrations preserved)"
    );
    console.log(
      "💡 To re-register OAuth clients, run: npm run register-oauth-clients"
    );
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await redis.disconnect();
    console.log("👋 Disconnected from Redis");
  }
}

clearAllSessions();
