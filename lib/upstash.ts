import { NextRequest, userAgent } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";
import { LinkProps } from "@/lib/types";
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

/**
 * Get the links associated with a project
 **/
export async function getLinksForProject(
  domain: string,
  userId?: string,
): Promise<LinkProps[]> {
  /*
    This function is used to get all links for a project.

    Only applicable for dub.sh:
      - If a username is provided, it will only return links for that user.
        Otherwise, it will return all links for the project.
  */
  const keys = await redis.zrange<string[]>(
    `${domain}:links:timestamps${userId ? `:${userId}` : ""}`,
    0,
    -1,
    {
      rev: true,
    },
  );
  if (!keys || keys.length === 0) return []; // no links for this project
  const metadata = (await redis.hmget(`${domain}:links`, ...keys)) as {
    [key: string]: Omit<LinkProps, "key">;
  };
  const links = keys.map((key) => ({
    key,
    ...metadata[key],
  }));
  return links;
}

/**
 * Get the number of links that a project has
 **/
export async function getLinkCountForProject(slug: string) {
  return await redis.zcard(`${slug}:links:timestamps`);
}

export async function getLinkClicksCount(domain: string, key: string) {
  const start = Date.now() - 2629746000; // 30 days ago
  return (
    (await redis.zcount(`${domain}:clicks:${key}`, start, Date.now())) || 0
  );
}

export async function changeDomain(domain: string, newHostname: string) {
  const keys = await redis.zrange<string[]>(
    `${domain}:links:timestamps`,
    0,
    -1,
  );
  const pipeline = redis.pipeline();
  pipeline.rename(`${domain}:links`, `${newHostname}:links`);
  pipeline.rename(
    `${domain}:links:timestamps`,
    `${newHostname}:links:timestamps`,
  );
  pipeline.rename(`${domain}:root:clicks`, `${newHostname}:root:clicks`);
  keys.forEach((key) => {
    pipeline.rename(`${domain}:clicks:${key}`, `${newHostname}:clicks:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}

export async function deleteProject(domain: string) {
  const keys = await redis.zrange<string[]>(
    `${domain}:links:timestamps`,
    0,
    -1,
  );
  const pipeline = redis.pipeline();
  pipeline.del(`${domain}:links`);
  pipeline.del(`${domain}:links:timestamps`);
  pipeline.del(`${domain}:root:clicks`);
  keys.forEach((key) => {
    pipeline.del(`${domain}:clicks:${key}`);
  });
  try {
    return await pipeline.exec();
  } catch (e) {
    return null;
  }
}
