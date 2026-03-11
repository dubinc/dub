import { getLinkViaEdge } from "@/lib/planetscale";
import { LinkProps, RedisLinkProps } from "@/lib/types";
import {
  formatRedisLink,
  redisGlobal,
  redisGlobalWithTimeout,
} from "@/lib/upstash";
import { getCache, rewrite, waitUntil } from "@vercel/functions";
import { LRUCache } from "lru-cache";
import { decodeKey, isCaseSensitiveDomain } from "./case-sensitivity";
import { ExpandedLink } from "./utils/transform-link";

/*
 * Link LRU cache to reduce Redis load during traffic spikes.
 * Max 10,000 entries with 5-second TTL.
 */
const linkLRUCache = new LRUCache<string, RedisLinkProps>({
  max: 10000, // max 10,000 entries
  ttl: 5000, // 5 seconds
});
/*
 * When traffic spikes, new Fluid instances are spun up.
 * Since LRUCache is not shared between Fluid instances,
 * we fallback to Vercel cache if both LRUCache/Redis are not available
 */
export const vercelCache = getCache();

const VERCEL_CACHE_EXPIRATION = 60; // 1 minute
const REDIS_CACHE_EXPIRATION = 60 * 60 * 24;

class LinkCache {
  async mset(links: ExpandedLink[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redisGlobal.pipeline();

    links.forEach((link) => {
      const redisLink = formatRedisLink(link);
      const cacheKey = this._createKey({ domain: link.domain, key: link.key });
      pipeline.set(cacheKey, redisLink, { ex: REDIS_CACHE_EXPIRATION });
    });

    return await pipeline.exec();
  }

  async set(link: ExpandedLink) {
    const redisLink = formatRedisLink(link);
    const cacheKey = this._createKey({ domain: link.domain, key: link.key });

    // Update LRU cache immediately to prevent stale reads
    linkLRUCache.set(cacheKey, redisLink);
    waitUntil(
      vercelCache.set(cacheKey, redisLink, { ttl: VERCEL_CACHE_EXPIRATION }),
    );

    return await redisGlobal.set(cacheKey, redisLink, {
      ex: REDIS_CACHE_EXPIRATION,
    });
  }

  async get({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    // here we use linkcache:${domain}:${key} instead of this._createKey({ domain, key })
    // because the key can either be cached as case-sensitive or case-insensitive depending on the domain
    // so we should get the original key from the cache
    const cacheKey = `linkcache:${domain}:${key}`;

    // Check LRU cache first
    let cachedLink = linkLRUCache.get(cacheKey) || null;

    if (cachedLink) {
      console.log(`[LRU Cache HIT] ${cacheKey}`);
      linkLRUCache.set(cacheKey, cachedLink); // refresh the LRU cache
      return cachedLink;
    }

    console.log(`[LRU Cache MISS] ${cacheKey} - Checking redisGlobal...`);

    try {
      // Fallback to redisGlobal if LRU cache miss
      cachedLink = await redisGlobalWithTimeout.get<RedisLinkProps>(cacheKey);

      if (cachedLink) {
        console.log(`[Redis Cache HIT] ${cacheKey} - Populating LRU Cache...`);
        linkLRUCache.set(cacheKey, cachedLink); // persist to LRU cache
        return cachedLink;
      } else {
        console.log(
          `[Redis Cache MISS] ${cacheKey} - Not found in LRU or Redis, falling back to MySQL...`,
        );
        return null;
      }
    } catch (error) {
      console.error(`[Redis Cache Error] ${cacheKey} - ${error}`);

      cachedLink = (await vercelCache.get(cacheKey)) as RedisLinkProps | null;
      if (cachedLink) {
        console.log(`[Vercel Cache HIT] ${cacheKey}`);
        return cachedLink;
      }

      console.log(`[Vercel Cache MISS] ${cacheKey} - Falling back to MySQL...`);
      const linkData = await getLinkViaEdge({
        domain,
        key,
      });
      // no link found, rewrite to not found page
      if (!linkData) {
        rewrite(`/${domain}/not-found`);
      }
      cachedLink = formatRedisLink(linkData as any);
      await vercelCache.set(cacheKey, cachedLink, {
        ttl: VERCEL_CACHE_EXPIRATION,
      });
      return cachedLink;
    }
  }

  async delete({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    return await redisGlobal.del(this._createKey({ domain, key }));
  }

  async deleteMany(links: Pick<LinkProps, "domain" | "key">[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redisGlobal.pipeline();

    links.forEach(({ domain, key }) => {
      pipeline.del(this._createKey({ domain, key }));
    });

    return await pipeline.exec();
  }

  async expireMany(links: Pick<LinkProps, "domain" | "key">[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redisGlobal.pipeline();

    links.forEach(({ domain, key }) => {
      // expire the link cache key immediately
      pipeline.expire(this._createKey({ domain, key }), 1);
    });

    return await pipeline.exec();
  }

  _createKey({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    const caseSensitive = isCaseSensitiveDomain(domain);
    const originalKey = caseSensitive ? decodeKey(key) : key;
    const cacheKey = `linkcache:${domain}:${originalKey}`;

    return caseSensitive ? cacheKey : cacheKey.toLowerCase();
  }
}

export const linkCache = new LinkCache();
