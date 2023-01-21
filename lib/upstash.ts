import { NextRequest, userAgent } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { nanoid } from "@/lib/utils";

// Initiate Redis instance
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// only for dub.sh public demo
export async function setRandomKey(
  url: string,
): Promise<{ response: string; key: string }> {
  /* recursively set link till successful */
  const key = nanoid();
  const response = await redis.set(
    `dub.sh:${key}`,
    {
      url,
    },
    {
      nx: true,
      ex: 30 * 60, // 30 minutes
    },
  );
  if (response !== "OK") {
    // by the off chance that key already exists
    return setRandomKey(url);
  } else {
    return { response, key };
  }
}

/**
 * Recording metatags that were generated via `/api/edge/metatags`
 * If there's an error, it will be logged to a separate redis list for debugging
 **/
export async function recordMetatags(url: string, error: boolean) {
  if (url === "https://github.com/steven-tey/dub") {
    // don't log metatag generation for default URL
    return null;
  } else {
    return await redis.lpush(error ? "metatags-errors" : "metatags", {
      url,
    });
  }
}
