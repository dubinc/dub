import { LinkProps, RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis, redisWithTimeout } from "@/lib/upstash";
import { LRUCache } from "lru-cache";
import { decodeKey, isCaseSensitiveDomain } from "./case-sensitivity";
import { ExpandedLink } from "./utils/transform-link";

/*
 * Link LRU cache to reduce Redis load during traffic spikes.
 * Max 5000 entries with 3-second TTL.
 */
const linkLRUCache = new LRUCache<string, RedisLinkProps>({
  max: 5000, // max 5000 entries
  ttl: 3000, // 3 seconds
});

/*
 * Link cache expiration is set to 24 hours by default for all links.
 * Caveat: we don't set expiration for links with webhooks since it's expensive
 * to fetch and set on-demand inside link middleware.
 */
export const CACHE_EXPIRATION = 60 * 60 * 24;

class LinkCache {
  async mset(links: ExpandedLink[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    const redisLinks = await Promise.all(
      links.map((link) => ({
        ...formatRedisLink(link),
        cacheKey: this._createKey({ domain: link.domain, key: link.key }),
      })),
    );

    redisLinks.map(({ cacheKey, ...redisLink }) => {
      const hasWebhooks =
        redisLink.webhookIds && redisLink.webhookIds.length > 0;

      pipeline.set(
        cacheKey,
        redisLink,
        hasWebhooks ? undefined : { ex: CACHE_EXPIRATION },
      );
    });

    return await pipeline.exec();
  }

  async set(link: ExpandedLink) {
    const redisLink = formatRedisLink(link);
    const hasWebhooks = redisLink.webhookIds && redisLink.webhookIds.length > 0;
    const cacheKey = this._createKey({ domain: link.domain, key: link.key });

    // Update LRU cache immediately to prevent stale reads
    linkLRUCache.set(cacheKey, redisLink);

    return await redis.set(
      cacheKey,
      redisLink,
      hasWebhooks ? undefined : { ex: CACHE_EXPIRATION },
    );
  }

  async get({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    // here we use linkcache:${domain}:${key} instead of this._createKey({ domain, key })
    // because the key can either be cached as case-sensitive or case-insensitive depending on the domain
    // so we should get the original key from the cache
    const cacheKey = `linkcache:${domain}:${key}`;

    // Check LRU cache first before hitting Redis
    let cachedLink = linkLRUCache.get(cacheKey) || null;

    if (cachedLink) {
      console.log(`[LRU Cache HIT] ${cacheKey}`);
      return cachedLink;
    }

    console.log(`[LRU Cache MISS] ${cacheKey} - Checking Redis...`);
    try {
      // we're using the special redisWithTimeout client in case Redis times out
      cachedLink = await redisWithTimeout.get<RedisLinkProps>(cacheKey);

      if (cachedLink) {
        console.log(`[Redis Cache HIT] ${cacheKey} - Populating LRU cache...`);
        linkLRUCache.set(cacheKey, cachedLink);
      } else {
        console.log(
          `[Redis Cache MISS] ${cacheKey} - Not found in LRU or Redis, falling back to MySQL...`,
        );
      }

      return cachedLink;
    } catch (error) {
      console.error(
        "[LinkCache] – Timeout getting cached link from Redis, falling back to MySQL...",
        error,
      );

      return null;
    }
  }

  async delete({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    return await redis.del(this._createKey({ domain, key }));
  }

  async deleteMany(links: Pick<LinkProps, "domain" | "key">[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    links.forEach(({ domain, key }) => {
      pipeline.del(this._createKey({ domain, key }));
    });

    return await pipeline.exec();
  }

  async expireMany(links: Pick<LinkProps, "domain" | "key">[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

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
