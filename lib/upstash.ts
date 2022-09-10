import { Redis } from "@upstash/redis";
import { NextRequest, userAgent } from "next/server";
import { LOCALHOST_GEO_DATA } from "@/lib/constants";
import { LinkProps } from "@/lib/types";
import { customAlphabet } from "nanoid";
import { getTitleFromUrl } from "@/lib/utils";

// Initiate Redis instance
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
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
  7
); // 7-character random string

export async function setKey(
  hostname: string,
  key: string,
  url: string,
  title?: string
) {
  return await redis.hsetnx(`${hostname}:links`, key, {
    url,
    title: title || (await getTitleFromUrl(url)),
    timestamp: Date.now(),
  });
}

export async function setRandomKey(
  hostname: string,
  url: string,
  title?: string
): Promise<{ response: number; key: string }> {
  /* recursively set link till successful */
  const key = nanoid();
  const response = await setKey(hostname, key, url, title); // add to hash
  if (response === 0) {
    // by the off chance that key already exists
    return setRandomKey(hostname, url, title);
  } else {
    return { response, key };
  }
}

export async function checkIfKeyExists(hostname: string, key: string) {
  return await redis.hexists(`${hostname}:links`, key);
}

/**
 * Recording clicks with geo, ua, referer and timestamp data
 **/
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

/**
 * Get the links associated with a project
 **/
export async function getLinksForProject(
  slug: string,
  userId?: string
): Promise<LinkProps[]> {
  /*
    This function is used to get all links for a project.

    Only applicable for dub.sh:
      - If a username is provided, it will only return links for that user.
        Otherwise, it will return all links for the project.
  */
  const keys = await redis.zrange<string[]>(
    `${slug}:links:timestamps${userId ? `:${userId}` : ""}`,
    0,
    -1,
    {
      rev: true,
    }
  );
  if (!keys || keys.length === 0) return []; // no links for this project
  const metadata = (await redis.hmget(`${slug}:links`, ...keys)) as {
    [key: string]: Omit<LinkProps, "key">;
  };
  const links = keys.map((key) => ({
    key,
    ...metadata[key],
  }));
  return links;
}

export async function addLink(
  hostname: string,
  url: string,
  key?: string, // if key is provided, it will be used
  title?: string, // if title is provided, it will be used
  userId?: string // only applicable for dub.sh links
) {
  const response = key
    ? await setKey(hostname, key, url, title)
    : await setRandomKey(hostname, url, title);

  if (response === 1) {
    const pipeline = redis.pipeline();
    pipeline.zadd(`${hostname}:links:timestamps${userId ? `:${userId}` : ""}`, {
      score: Date.now(),
      member: key,
    });
    pipeline.zadd(`${hostname}:links:clicks`, {
      score: 0,
      member: key,
    });
    return await pipeline.exec();
  } else {
    return null; // key already exists
  }
}

/**
 * Edit a link
 **/
export async function editLink(
  hostname: string,
  key: string,
  newKey: string,
  url: string,
  title: string,
  timestamp: number,
  userId?: string
) {
  if (key === newKey) {
    // if key is the same, just update the url and title
    return await redis.hset(`${hostname}:links`, {
      [key]: { url, title, timestamp },
    });
  } else {
    // if key is different
    // get number of clicks for key (we'll add it to newKey)
    const numClicks = await redis.zcard(`${hostname}:clicks:${key}`);
    const pipeline = redis.pipeline();
    // delete old key and add new key from hash
    pipeline.hdel(`${hostname}:links`, key);
    pipeline.hset(`${hostname}:links`, {
      [newKey]: { url, title, timestamp },
    });
    // remove old key from links:timestamps and add new key (with same timestamp)
    pipeline.zrem(
      `${hostname}:links:timestamps${userId ? `:${userId}` : ""}`,
      key
    );
    pipeline.zadd(`${hostname}:links:timestamps${userId ? `:${userId}` : ""}`, {
      score: timestamp,
      member: newKey,
    });
    // remove old key from links:clicks and add new key (with same score)
    pipeline.zrem(`${hostname}:links:clicks`, key);
    pipeline.zadd(`${hostname}:links:clicks`, {
      score: numClicks,
      member: newKey,
    });
    // update name for clicks:[key] (if numClicks > 0, because we don't create clicks:[key] until the first click)
    if (numClicks > 0) {
      pipeline.rename(
        `${hostname}:clicks:${key}`,
        `${hostname}:clicks:${newKey}`
      );
    }
    return await pipeline.exec();
  }
}
