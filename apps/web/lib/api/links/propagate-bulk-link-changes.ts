import { recordLink } from "@/lib/tinybird";
import { RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { linkCache } from "./cache";
import { ExpandedLink } from "./utils";

export async function propagateBulkLinkChanges(links: ExpandedLink[]) {
  const pipeline = redis.pipeline();

  // split links into domains for better write effeciency in Redis
  const linksByDomain: Record<string, Record<string, RedisLinkProps>> = {};

  await Promise.all(
    links.map(async (link) => {
      const { domain, key } = link;

      if (!linksByDomain[domain]) {
        linksByDomain[domain] = {};
      }
      // this technically will be a synchronous function since isIframeable won't be run for bulk link creation
      const formattedLink = await formatRedisLink(link);
      linksByDomain[domain][key.toLowerCase()] = formattedLink;
    }),
  );

  Object.entries(linksByDomain).forEach(([domain, links]) => {
    pipeline.hset(domain.toLowerCase(), links);
  });

  await Promise.all([
    // update Redis
    linkCache.mset(links),

    // update Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags?.map(({ tag }) => tag.id) ?? [],
        workspace_id: link.projectId,
        created_at: link.createdAt,
      })),
    ),
  ]);
}
