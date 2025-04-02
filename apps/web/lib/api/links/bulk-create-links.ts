import { ProcessedLinkProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { getParamsFromURL, linkConstructorSimple, truncate } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { createId } from "../create-id";
import { combineTagIds } from "../tags/combine-tag-ids";
import { encodeKeyIfCaseSensitive } from "./case-sensitivity";
import { includeTags } from "./include-tags";
import { propagateBulkLinkChanges } from "./propagate-bulk-link-changes";
import { updateLinksUsage } from "./update-links-usage";
import {
  checkIfLinksHaveTags,
  checkIfLinksHaveWebhooks,
  transformLink,
} from "./utils";

export async function bulkCreateLinks({
  links,
  skipRedisCache = false,
}: {
  links: ProcessedLinkProps[];
  skipRedisCache?: boolean;
}) {
  if (links.length === 0) return [];

  const hasTags = checkIfLinksHaveTags(links);
  const hasWebhooks = checkIfLinksHaveWebhooks(links);

  // Create a map of shortLinks to their original indices at the start
  const shortLinkToIndexMap = new Map(
    links.map((link, index) => {
      const key = encodeKeyIfCaseSensitive({
        domain: link.domain,
        key: link.key,
      });

      return [
        linkConstructorSimple({
          domain: link.domain,
          key,
        }),
        index,
      ];
    }),
  );

  // Create all links first using createMany
  await prisma.link.createMany({
    data: links.map(({ tagId, tagIds, tagNames, webhookIds, ...link }) => {
      const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
        getParamsFromURL(link.url);

      link.key = encodeKeyIfCaseSensitive({
        domain: link.domain,
        key: link.key,
      });

      return {
        ...link,
        id: createId({ prefix: "link_" }),
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
    skipDuplicates: true,
  });

  // Fetch the created links to get their IDs
  let createdLinksData = await prisma.link.findMany({
    where: {
      shortLink: {
        in: Array.from(shortLinkToIndexMap.keys()),
      },
    },
  });

  if (hasTags || hasWebhooks) {
    // Create tags and webhooks in parallel if needed
    const createRelationsPromises: Promise<any>[] = [];

    if (hasTags) {
      const linkTagsToCreate: {
        linkId: string;
        tagId: string;
        createdAt: Date;
      }[] = [];

      let tagNameToIdMap: Record<string, string> = {};

      if (links.some((link) => link.tagNames?.length)) {
        const allTagNames = [
          ...new Set(links.flatMap((link) => link.tagNames).filter(Boolean)),
        ] as string[];

        const allTagIds = await prisma.tag.findMany({
          where: {
            projectId: links[0].projectId!,
            name: {
              in: allTagNames,
            },
          },
        });

        tagNameToIdMap = allTagIds.reduce(
          (acc, tag) => {
            acc[tag.name.toLowerCase()] = tag.id;
            return acc;
          },
          {} as Record<string, string>,
        );
      }

      createdLinksData.forEach((link, idx) => {
        const originalLink = links[idx];
        if (!originalLink) return;

        const { tagId, tagIds, tagNames } = originalLink;
        const combinedTagIds = combineTagIds({ tagId, tagIds });

        // Handle tag creation by IDs
        if (combinedTagIds && combinedTagIds.length > 0) {
          combinedTagIds.filter(Boolean).forEach((tagId, tagIdx) => {
            linkTagsToCreate.push({
              linkId: link.id,
              tagId,
              createdAt: new Date(new Date().getTime() + tagIdx * 100),
            });
          });
        }

        if (tagNames && tagNames.length > 0) {
          tagNames.filter(Boolean).forEach((tagName, tagIdx) => {
            linkTagsToCreate.push({
              linkId: link.id,
              tagId: tagNameToIdMap[tagName.toLowerCase()],
              createdAt: new Date(new Date().getTime() + tagIdx * 100),
            });
          });
        }
      });

      if (linkTagsToCreate.length > 0) {
        createRelationsPromises.push(
          prisma.linkTag.createMany({
            data: linkTagsToCreate,
            skipDuplicates: true,
          }),
        );
      }
    }

    if (hasWebhooks) {
      const linkWebhooksToCreate: { linkId: string; webhookId: string }[] = [];

      createdLinksData.forEach((link, idx) => {
        const originalLink = links[idx];
        if (!originalLink?.webhookIds?.length) return;

        originalLink.webhookIds.forEach((webhookId) => {
          linkWebhooksToCreate.push({
            linkId: link.id,
            webhookId,
          });
        });
      });

      if (linkWebhooksToCreate.length > 0) {
        createRelationsPromises.push(
          prisma.linkWebhook.createMany({
            data: linkWebhooksToCreate,
            skipDuplicates: true,
          }),
        );
      }
    }

    // Wait for all relations to be created
    if (createRelationsPromises.length > 0) {
      await Promise.all(createRelationsPromises);
    }

    // Refetch the links with their relations to return the complete data
    createdLinksData = await prisma.link.findMany({
      where: {
        id: {
          in: createdLinksData.map((link) => link.id),
        },
      },
      include: {
        ...includeTags,
        webhooks: hasWebhooks
          ? {
              select: {
                webhookId: true,
              },
            }
          : false,
      },
    });
  }

  waitUntil(
    Promise.all([
      propagateBulkLinkChanges({
        links: createdLinksData,
        skipRedisCache,
      }),
      updateLinksUsage({
        workspaceId: links[0].projectId!, // this will always be present
        increment: links.length,
      }),
    ]),
  );

  // Simplified sorting using the map
  createdLinksData = createdLinksData.sort((a, b) => {
    const aIndex = shortLinkToIndexMap.get(a.shortLink) ?? -1;
    const bIndex = shortLinkToIndexMap.get(b.shortLink) ?? -1;
    return aIndex - bIndex;
  });

  return createdLinksData.map((link) => transformLink(link));
}
