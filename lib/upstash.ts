import { NextRequest, userAgent } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";
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
    const pipeline = redis.pipeline();
    pipeline.zadd(`dub.sh:clicks:${key}`, {
      score: Date.now(),
      member: {
        geo: LOCALHOST_GEO_DATA,
        ua: "Dub-Bot",
        referer: "https://dub.sh",
        timestamp: Date.now(),
      },
    });
    pipeline.expire(`dub.sh:clicks:${key}`, 30 * 60); // 30 minutes
    await pipeline.exec();
    return { response, key };
  }
}

/**
 * Recording clicks with geo, ua, referer and timestamp data
 * If key is not specified, record click as the root click
 **/
export async function recordClick(
  domain: string,
  req: NextRequest,
  key?: string,
) {
  return await redis.zadd(
    key ? `${domain}:clicks:${key}` : `${domain}:root:clicks`,
    {
      score: Date.now(),
      member: {
        geo: process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA,
        ua: userAgent(req),
        referer: req.headers.get("referer"),
        timestamp: Date.now(),
      },
    },
  );
}

export async function getLinkClicksCount(domain: string, key: string) {
  const start = Date.now() - 2629746000; // 30 days ago
  return (
    (await redis.zcount(`${domain}:clicks:${key}`, start, Date.now())) || 0
  );
}
