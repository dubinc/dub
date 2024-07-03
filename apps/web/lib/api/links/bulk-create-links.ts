import { prisma } from "@/lib/prisma";
import { ProcessedLinkProps } from "@/lib/types";
import { getParamsFromURL, truncate } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { propagateBulkLinkChanges } from "./propagate-bulk-link-changes";
import { updateLinksUsage } from "./update-links-usage";
import { combineTagIds, transformLink } from "./utils";

export async function bulkCreateLinks({
  links,
}: {
  links: ProcessedLinkProps[];
}) {
  if (links.length === 0) return [];

  // create links via Promise.all (because Prisma doesn't support nested createMany)
  // ref: https://github.com/prisma/prisma/issues/8131#issuecomment-997667070
  const createdLinks = await Promise.all(
    links.map(({ tagId, tagIds, tagNames, ...link }) => {
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
