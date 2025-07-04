import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
});

let isConnected = false;

export async function ensureConnected() {
  if (!isConnected && !redis.isOpen) {
    await redis.connect();
    isConnected = true;
  }
}

export default redis;
