import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import {
  getParamsFromURL,
  linkConstructor,
  linkConstructorSimple,
  truncate,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { propagateBulkLinkChanges } from "./propagate-bulk-link-changes";
import { updateLinksUsage } from "./update-links-usage";
import {
  checkIfLinksHaveTags,
  checkIfLinksHaveWebhooks,
  combineTagIds,
  LinkWithTags,
  transformLink,
} from "./utils";

export async function bulkCreateLinks({
  links,
}: {
  links: ProcessedLinkProps[];
}) {
  if (links.length === 0) return [];

  const hasTags = checkIfLinksHaveTags(links);
  const hasWebhooks = checkIfLinksHaveWebhooks(links);

  let createdLinks: LinkWithTags[] = [];

  if (hasTags || hasWebhooks) {
    // create links via Promise.all (because createMany doesn't return the created links)
    // @see https://github.com/prisma/prisma/issues/8131#issuecomment-997667070
    // there is createManyAndReturn but it's not available for MySQL :(
    // @see https://www.prisma.io/docs/orm/reference/prisma-client-reference#createmanyandreturn
    createdLinks = await Promise.all(
      links.map(({ tagId, tagIds, tagNames, webhookIds, ...link }) => {
        const shortLink = linkConstructor({
          domain: link.domain,
          key: link.key,
        });
        const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
          getParamsFromURL(link.url);

        const combinedTagIds = combineTagIds({ tagId, tagIds });

        return prisma.link.create({
          data: {
            ...link,
            shortLink,
            title: truncate(link.title, 120),
            description: truncate(link.description, 240),
            utm_source,
            utm_medium,
            utm_campaign,
            utm_term,
            utm_content,
            expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
            geo: link.geo || undefined,

            // Associate tags by tagNames
            ...(tagNames?.length &&
              link.projectId && {
                tags: {
                  create: tagNames.filter(Boolean).map((tagName) => ({
                    tag: {
                      connect: {
                        name_projectId: {
                          name: tagName,
                          projectId: link.projectId as string,
                        },
                      },
                    },
                  })),
                },
              }),

            // Associate tags by IDs (takes priority over tagNames)
            ...(combinedTagIds &&
              combinedTagIds.length > 0 && {
                tags: {
                  createMany: {
                    data: combinedTagIds
                      .filter(Boolean)
                      .map((tagId) => ({ tagId })),
                  },
                },
              }),

            ...(webhookIds &&
              webhookIds.length > 0 && {
                webhooks: {
                  createMany: {
                    data: webhookIds.map((webhookId) => ({
                      webhookId,
                    })),
                  },
                },
              }),
          },
          include: {
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
            webhooks: hasWebhooks,
          },
        });
      }),
    );
  } else {
    // if there are no tags, we can use createMany to create the links
    await prisma.link.createMany({
      data: links.map(({ tagId, tagIds, tagNames, ...link }) => {
        const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
          getParamsFromURL(link.url);

        return {
          ...link,
          shortLink: linkConstructorSimple({
            domain: link.domain,
            key: link.key,
          }),
          title: truncate(link.title, 120),
          description: truncate(link.description, 240),
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : null,
          geo: link.geo || undefined,
        };
      }),
    });

    createdLinks = await prisma.link.findMany({
      where: {
        shortLink: {
          in: links.map((link) =>
            linkConstructorSimple({
              domain: link.domain,
              key: link.key,
            }),
          ),
        },
      },
    });
  }

  waitUntil(
    Promise.all([
      propagateBulkLinkChanges(createdLinks),
      updateLinksUsage({
        workspaceId: links[0].projectId!, // this will always be present
        increment: links.length,
      }),
    ]),
  );

  return createdLinks.map((link) => transformLink(link));
}
