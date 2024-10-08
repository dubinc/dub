import { LinkProps, RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";

const CACHE_EXPIRATION = 60 * 60 * 24 * 7;

class LinkCache {
  async mset(links: (LinkProps & { webhookIds?: string[] })[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    const redisLinks = await Promise.all(
      links.map(async (link) => ({
        ...(await formatRedisLink(link)),
        key: link.key.toLowerCase(),
        domain: link.domain.toLowerCase(),
      })),
    );

    redisLinks.map(({ domain, key, ...redisLink }) =>
      pipeline.set(`${domain}:${key}`, JSON.stringify(redisLink), {
        ex: CACHE_EXPIRATION,
      }),
    );

    return await pipeline.exec();
  }

  async set({
    link,
    domain,
    key,
  }: {
    link: RedisLinkProps;
    domain: string;
    key: string;
  }) {
    const cacheKey = `${domain}:${key}`.toLowerCase();

    return await redis.set(cacheKey, JSON.stringify(link), {
      ex: CACHE_EXPIRATION,
    });
  }

  async get({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    const cacheKey = `${domain}:${key}`.toLowerCase();

    return await redis.get<RedisLinkProps>(cacheKey);
  }

  async delete({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    const cacheKey = `${domain}:${key}`.toLowerCase();

    return await redis.del(cacheKey);
  }

  async deleteMany(links: Pick<LinkProps, "domain" | "key">[]) {
    if (links.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    links.forEach(({ domain, key }) => {
      pipeline.del(`${domain}:${key}`.toLowerCase());
    });

    return await pipeline.exec();
  }

  async rename({
    oldDomain,
    links,
  }: {
    oldDomain: string;
    links: Pick<LinkProps, "domain" | "key">[];
  }) {
    const pipeline = redis.pipeline();

    links.forEach(({ domain, key }) => {
      const oldCacheKey = `${oldDomain}:${key}`.toLowerCase();
      const newCacheKey = `${domain}:${key}`.toLowerCase();

      pipeline.rename(oldCacheKey, newCacheKey);
    });

    return await pipeline.exec();
  }
}

export const linkCache = new LinkCache();
