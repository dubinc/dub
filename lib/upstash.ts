import { NextRequest, userAgent } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { customAlphabet } from "nanoid";
import { LOCALHOST_GEO_DATA, RESERVED_KEYS } from "@/lib/constants";
import { LinkProps, ProjectProps } from "@/lib/types";
import {
  getDescriptionFromUrl,
  getFirstAndLastDay,
  getTitleFromUrl,
} from "@/lib/utils";

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

/**
 * Everything to do with keys:
 * - Set a defined key
 * - Set a random key
 * - Generate a random key
 * - Check if key exists
 **/

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  7,
); // 7-character random string

export async function setKey(
  domain: string,
  key: string,
  url: string,
  title?: string,
  description?: string, // only for Pro users: customize description
  image?: string, // only for Pro users: customize OG image
) {
  return await redis.hsetnx(`${domain}:links`, key, {
    url,
    title: title || (await getTitleFromUrl(url)),
    description:
      image && !description ? getDescriptionFromUrl(url) : description,
    image,
    timestamp: Date.now(),
  });
}

export async function setRandomKey(
  domain: string,
  url: string,
  title?: string,
): Promise<{ response: number; key: string }> {
  /* recursively set link till successful */
  const key = nanoid();
  const response = await setKey(domain, key, url, title); // add to hash
  if (response === 0) {
    // by the off chance that key already exists
    return setRandomKey(domain, url, title);
  } else {
    return { response, key };
  }
}

export async function getRandomKey(domain: string): Promise<string> {
  /* recursively get random key till it gets one that's avaialble */
  const key = nanoid();
  const response = await redis.hexists(`${domain}:links`, key); // check if key exists
  if (response === 1) {
    // by the off chance that key already exists
    return getRandomKey(domain);
  } else {
    return key;
  }
}

export async function checkIfKeyExists(domain: string, key: string) {
  if (domain === "dub.sh" && RESERVED_KEYS.has(key)) {
    return 1; // reserved keys for dub.sh
  }
  return await redis.hexists(`${domain}:links`, key);
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

export async function addLink(
  domain: string,
  link: LinkProps,
  userId?: string, // only applicable for dub.sh links
) {
  const {
    key, // if key is provided, it will be used
    url,
    title, // if title is provided, it will be used
    description, // only for Pro users: customize description
    image, // only for Pro users: customize OG image
  } = link;

  if (domain === "dub.sh" && key && RESERVED_KEYS.has(key)) {
    return null; // reserved keys for dub.sh
  }
  const response = key
    ? await setKey(domain, key, url, title, description, image)
    : await setRandomKey(domain, url, title); // not possible to add description and image for random keys (only for dub.sh landing page input)

  if (response === 1) {
    return await redis.zadd(
      `${domain}:links:timestamps${userId ? `:${userId}` : ""}`,
      {
        score: Date.now(),
        member: key,
      },
    );
  } else {
    return null; // key already exists
  }
}

/**
 * Get the usage for a project
 **/
export async function getUsage(
  domain: string,
  billingCycleStart: number,
): Promise<number> {
  const { firstDay, lastDay } = getFirstAndLastDay(billingCycleStart);

  const links = await redis.zrange(`${domain}:links:timestamps`, 0, -1);
  let results: number[] = [];

  if (links.length > 0) {
    const pipeline = redis.pipeline();
    links.forEach((link) => {
      pipeline.zcount(
        `${domain}:clicks:${link}`,
        firstDay.getTime(),
        lastDay.getTime(),
      );
    });
    results = await pipeline.exec();
  }
  const usage = results.reduce((acc, curr) => acc + curr, 0);
  return usage;
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
