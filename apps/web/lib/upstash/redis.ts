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

const redisGlobalBase = new Redis({
  url: hasGlobalRedisConfig
    ? process.env.UPSTASH_GLOBAL_REDIS_REST_URL
    : process.env.UPSTASH_REDIS_REST_URL || "",
  token: hasGlobalRedisConfig
    ? process.env.UPSTASH_GLOBAL_REDIS_REST_TOKEN
    : process.env.UPSTASH_REDIS_REST_TOKEN || "",
  signal: () => AbortSignal.timeout(1000),
});

// On timeout (or other errors), get() method calls return null instead of throwing
export const redisGlobal = new Proxy(redisGlobalBase, {
  get(target, prop) {
    const value = target[prop as keyof Redis];
    if (prop === "get" && typeof value === "function") {
      return async (...args: unknown[]) => {
        try {
          return await (value as (...args: unknown[]) => unknown).apply(
            target,
            args,
          );
        } catch (error) {
          console.error(
            "[redisGlobal] – Timeout getting value from Redis, returning null...",
            error,
          );
          return null;
        }
      };
    }
    return value;
  },
});
