import { Redis } from "@upstash/redis";

const LIFETIME_SCANS_KEY = "tracelattice:stats:lifetime-scans";

let redisClient: Redis | null = null;

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!redisClient) redisClient = new Redis({ url, token });
  return redisClient;
}

function normalizeCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

export async function getLifetimeScanCount() {
  const redis = getRedis();
  if (!redis) return null;
  return normalizeCount(await redis.get<number | string>(LIFETIME_SCANS_KEY));
}

export async function incrementLifetimeScanCount() {
  const redis = getRedis();
  if (!redis) return null;
  return normalizeCount(await redis.incr(LIFETIME_SCANS_KEY));
}
