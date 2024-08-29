import { LinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";

class LinkCache {
  async mset(links: (LinkProps & { webhookIds?: string[] })[]) {
    const pipeline = redis.pipeline();

    const redisLinks = await Promise.all(
      links.map(async (link) => ({
        ...(await formatRedisLink(link)),
        key: link.key.toLowerCase(),
        domain: link.domain.toLowerCase(),
      })),
    );

    redisLinks.map(({ key, domain, ...redisLink }) => {
      pipeline.hset(domain, {
        [key]: redisLink,
      });
    });

    await pipeline.exec();
  }
}

export const linkCache = new LinkCache();
