import { Redis } from "@upstash/redis";

// Initiate Redis instance by connecting to REST URL
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// This is a separate global Redis instance that we use
// for global operations (e.g. linkCache, recordClick)
// so that if this redis goes down, it won't impact other endpoints
const hasGlobalRedisConfig =
  !!process.env.UPSTASH_GLOBAL_REDIS_REST_URL &&
  !!process.env.UPSTASH_GLOBAL_REDIS_REST_TOKEN;

const redisConfig = {
  url: hasGlobalRedisConfig
    ? process.env.UPSTASH_GLOBAL_REDIS_REST_URL
    : process.env.UPSTASH_REDIS_REST_URL || "",
  token: hasGlobalRedisConfig
    ? process.env.UPSTASH_GLOBAL_REDIS_REST_TOKEN
    : process.env.UPSTASH_REDIS_REST_TOKEN || "",
};

export const redisGlobal = new Redis(redisConfig);

export const redisGlobalWithTimeout = new Redis({
  ...redisConfig,
  signal: () => AbortSignal.timeout(1500),
});
