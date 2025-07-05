import { storeClient, type OAuthClient } from "../lib/redis-oauth";
import { redis } from "../lib/redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEFAULT_CLIENTS: OAuthClient[] = [
  {
    id: "88M8ae9QLcoEsozE",
    clientId: "88M8ae9QLcoEsozE",
    clientSecret: "default-secret-for-development",
    name: "Claude Desktop",
    redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
    createdAt: new Date().toISOString(),
  },
];

async function registerOAuthClients() {
  try {
    console.log("🔐 Registering OAuth clients...\n");

    if (!redis.isReady) {
      await redis.connect();
    }

    for (const client of DEFAULT_CLIENTS) {
      console.log(`📝 Registering client: ${client.name} (${client.clientId})`);
      await storeClient(client);
      console.log(`✅ Successfully registered ${client.name}`);
      console.log(`   Client ID: ${client.clientId}`);
      console.log(`   Redirect URIs: ${client.redirectUris.join(", ")}\n`);
    }

    console.log("✨ All OAuth clients registered successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error registering OAuth clients:", error);
    process.exit(1);
  }
}

registerOAuthClients();