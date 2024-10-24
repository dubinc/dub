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
      pipeline.set(
        this._createKey({ domain, key }),
        JSON.stringify(redisLink),
        {
          ex: CACHE_EXPIRATION,
        },
      ),
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
    return await redis.set(
      this._createKey({ domain, key }),
      JSON.stringify(link),
      {
        ex: CACHE_EXPIRATION,
      },
    );
  }

  async get({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    return await redis.get<RedisLinkProps>(this._createKey({ domain, key }));
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
    oldDomain,
    links,
  }: {
    oldDomain: string;
    links: Pick<LinkProps, "domain" | "key">[];
  }) {
    const pipeline = redis.pipeline();

    links.forEach(({ domain, key }) => {
      const oldCacheKey = this._createKey({ domain: oldDomain, key });
      const newCacheKey = this._createKey({ domain, key });

      pipeline.rename(oldCacheKey, newCacheKey);
    });

    return await pipeline.exec();
  }

  _createKey({ domain, key }: Pick<LinkProps, "domain" | "key">) {
    return `${domain}:${key}`.toLowerCase();
  }
}

export const linkCache = new LinkCache();
