import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

import { NextRequest, userAgent } from "next/server";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";

export async function recordClick(
  hostname: string,
  key: string,
  req: NextRequest
) {
  const pipeline = redis.pipeline();
  pipeline.zadd(`${hostname}:clicks:${key}`, {
    score: Date.now(),
    member: {
      geo: process.env.VERCEL === "1" ? req.geo : LOCALHOST_GEO_DATA,
      ua: userAgent(req),
      referer: req.headers.get("referer"),
      timestamp: Date.now(),
    },
  });
  pipeline.zincrby(`${hostname}:links:clicks`, 1, key);
  return await pipeline.exec();
}
