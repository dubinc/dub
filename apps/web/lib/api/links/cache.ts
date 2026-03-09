import { LinkProps, RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redisGlobal } from "@/lib/upstash";
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
 * Link cache expiration is set to 24 hours by default for all links.
 */
const CACHE_EXPIRATION = 60 * 60 * 24;

class LinkCache {
  async mset(links: ExpandedLink[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redisGlobal.pipeline();

    links.forEach((link) => {
      const redisLink = formatRedisLink(link);
      const cacheKey = this._createKey({ domain: link.domain, key: link.key });
      pipeline.set(cacheKey, redisLink, { ex: CACHE_EXPIRATION });
    });

    return await pipeline.exec();
  }

  async set(link: ExpandedLink) {
    const redisLink = formatRedisLink(link);
    const cacheKey = this._createKey({ domain: link.domain, key: link.key });

    // Update LRU cache immediately to prevent stale reads
    linkLRUCache.set(cacheKey, redisLink);

    return await redisGlobal.set(cacheKey, redisLink, { ex: CACHE_EXPIRATION });
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

    // Fallback to redisGlobal if LRU cache miss
    cachedLink = await redisGlobal.get<RedisLinkProps>(cacheKey);

    if (cachedLink) {
      console.log(`[Redis Cache HIT] ${cacheKey} - Populating LRU Cache...`);
      linkLRUCache.set(cacheKey, cachedLink); // persist to LRU cache
      return cachedLink;
    } else {
      console.log(
        `[Redis Cache MISS] ${cacheKey} - Not found in LRU or Redis, falling back to MySQL...`,
      );
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
