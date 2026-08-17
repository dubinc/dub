import {
  PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
  queuePartnerSearchSyncForLinks,
} from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import { isNotHostedImage, storage } from "@/lib/storage";
import { bulkUpdateLinksBodySchema } from "@/lib/zod/schemas/links";
import { R2_URL, getParamsFromURL, nanoid, truncate } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { combineTagIds } from "../tags/combine-tag-ids";
import { includeProgramEnrollment } from "./include-program-enrollment";
import { includeTags } from "./include-tags";
import { propagateBulkLinkChanges } from "./propagate-bulk-link-changes";
import { transformLink } from "./utils";

export async function bulkUpdateLinks(
  // omit externalIds from params
  params: Omit<z.infer<typeof bulkUpdateLinksBodySchema>, "externalIds"> & {
    workspaceId: string;
  },
) {
  const { linkIds, data, workspaceId } = params;

  const {
    url,
    title,
    description,
    image,
    proxy,
    expiresAt,
    geo,
    testVariants,
    tagId,
    tagIds,
    tagNames,
    webhookIds,
    ...rest
  } = data;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const imageUrlNonce = nanoid(7);

  const updatedLinks = await Promise.all(
    linkIds.map((linkId) =>
      prisma.link.update({
        where: {
          id: linkId,
        },
        data: {
          ...rest,
          url,
          proxy,
          title: title ? truncate(title, 120) : title,
          description: description ? truncate(description, 240) : description,
          image:
            proxy && image && isNotHostedImage(image)
              ? `${R2_URL}/images/${linkIds[0]}_${imageUrlNonce}`
              : image,
          expiresAt: expiresAt ? new Date(expiresAt) : expiresAt,
          geo: geo === null ? Prisma.DbNull : geo,
          testVariants: testVariants === null ? Prisma.DbNull : testVariants,

          ...(url && getParamsFromURL(url)),
          // Associate tags by tagNames
          ...(tagNames &&
            workspaceId && {
              tags: {
                deleteMany: {},
                create: tagNames.map((tagName, idx) => ({
                  tag: {
                    connect: {
                      name_projectId: {
                        name: tagName,
                        projectId: workspaceId as string,
                      },
                    },
                  },
                  createdAt: new Date(new Date().getTime() + idx * 100), // increment by 100ms for correct order
                })),
              },
            }),

          // Associate tags by IDs (takes priority over tagNames)
          ...(combinedTagIds && {
            tags: {
              deleteMany: {},
              create: combinedTagIds.map((tagId, idx) => ({
                tagId,
                createdAt: new Date(new Date().getTime() + idx * 100), // increment by 100ms for correct order
              })),
            },
          }),

          // Associate webhooks
          ...(webhookIds && {
            webhooks: {
              deleteMany: {},
              create: webhookIds.map((webhookId) => ({
                webhookId,
              })),
            },
          }),
        },
        include: {
          ...includeTags,
          ...includeProgramEnrollment,
          webhooks: webhookIds ? { select: { webhookId: true } } : false,
        },
      }),
    ),
  );

  waitUntil(
    Promise.all([
      // propagate changes to redis and tinybird
      propagateBulkLinkChanges({
        links: updatedLinks,
      }),
      // A bulk edit can move the destination URL, and the key or domain behind
      // the short link. Queued on the link delay: the job re-reads the whole
      // document, so nothing else goes stale by waiting.
      queuePartnerSearchSyncForLinks(updatedLinks, {
        delay: PARTNER_SEARCH_LINK_SYNC_DELAY_SECONDS,
      }),
      // if proxy is true and image is not stored in R2, upload image to R2
      proxy &&
        image &&
        isNotHostedImage(image) &&
        storage.upload({
          key: `images/${linkIds[0]}_${imageUrlNonce}`,
          body: image,
          opts: {
            width: 1200,
            height: 630,
          },
        }),
    ]),
  );

  return updatedLinks.map((link) => transformLink(link));
}
