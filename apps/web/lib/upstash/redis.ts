import { Redis } from "@upstash/redis";

// Initiate Redis instance by connecting to REST URL
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Special Redis instance with timeout
export const redisWithTimeout = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  signal: () => AbortSignal.timeout(1000),
});

// This is a separate us-east-1 Redis instance that we use
// for high-volume ratelimit operations (e.g. recordClick)
// so that if this redis goes down, it won't impact other endpoints
export const redisUsEast = new Redis({
  url:
    process.env.UPSTASH_US_EAST_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "",
  token:
    process.env.UPSTASH_US_EAST_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "",
});
