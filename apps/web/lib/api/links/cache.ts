import { LinkProps, RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { decodeKey, isCaseSensitiveDomain } from "./case-sensitivity";
import { ExpandedLink } from "./utils/transform-link";

/*
 * Link cache expiration is set to 24 hours by default for all links.
 * Caveat: we don't set expiration for links with webhooks since it's expensive
 * to fetch and set on-demand inside link middleware.
 */
const CACHE_EXPIRATION = 60 * 60 * 24;

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

    return await redis.set(
      this._createKey({ domain: link.domain, key: link.key }),
      redisLink,
      hasWebhooks ? undefined : { ex: CACHE_EXPIRATION },
    );
  }

  async get({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    return await redis.get<RedisLinkProps>(`linkcache:${domain}:${key}`);
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

  async rename({
    links,
    oldDomain,
  }: {
    links: Pick<LinkProps, "domain" | "key">[];
    oldDomain: string;
  }) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    links.forEach(({ domain, key }) => {
      const oldCacheKey = this._createKey({ domain: oldDomain, key });
      const newCacheKey = this._createKey({ domain, key });

      pipeline.renamenx(oldCacheKey, newCacheKey);
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
