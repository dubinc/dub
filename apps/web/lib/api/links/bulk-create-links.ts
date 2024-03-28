import prisma from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { LinkProps, LinkWithTagIdsProps, RedisLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { getParamsFromURL, linkConstructor, truncate } from "@dub/utils";
import { combineTagIds } from "./utils";

export async function bulkCreateLinks({
  links,
}: {
  links: LinkWithTagIdsProps[];
}) {
  if (links.length === 0) return [];

  // create links via $transaction (because Prisma doesn't support nested createMany)
  // ref: https://github.com/prisma/prisma/issues/8131#issuecomment-997667070
  const createdLinks = await prisma.$transaction(
    links.map(({ tagId, tagIds, ...link }) => {
      const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
        getParamsFromURL(link.url);

      const combinedTagIds = combineTagIds({ tagId, tagIds });

      return prisma.link.create({
        data: {
          ...link,
          title: truncate(link.title, 120),
          description: truncate(link.description, 240),
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
          geo: link.geo || undefined,
          ...(combinedTagIds.length > 0 && {
            tags: {
              createMany: {
                data: combinedTagIds.map((tagId) => ({ tagId })),
              },
            },
          }),
        },
        include: {
          tags: {
            select: {
              tagId: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });
    }),
  );

  await propagateBulkLinkChanges(createdLinks);

  return createdLinks.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });
    const tags = link.tags.map(({ tag }) => tag);
    return {
      ...link,
      shortLink,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
      workspaceId: `ws_${link.projectId}`,
    };
  });
}

export async function propagateBulkLinkChanges(
  links: (LinkProps & { tags: { tagId: string }[] })[],
) {
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

      // record link in Tinybird
      await recordLink({ link });
    }),
  );

  Object.entries(linksByDomain).forEach(([domain, links]) => {
    pipeline.hset(domain, links);
  });

  await Promise.all([
    // update Redis
    pipeline.exec(),
    // update links usage for workspace
    prisma.project.update({
      where: {
        id: links[0].projectId!, // this will always be present
      },
      data: {
        linksUsage: {
          increment: links.length,
        },
      },
    }),
  ]);
}
