import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { nanoid } from "@/lib/utils";

// Initiate Redis instance by connecting to REST URL
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  return process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(requests, seconds),
        analytics: true,
      })
    : // if Redis is not configured, return a dummy ratelimiter
      // with the function limit() that always returns true
      {
        limit: () => ({ success: true }),
      };
};

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
