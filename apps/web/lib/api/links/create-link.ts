import { qstash } from "@/lib/cron";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { ProcessedLinkProps } from "@/lib/types";
import { propagateWebhookTriggerChanges } from "@/lib/webhook/update-webhook";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  R2_URL,
  getParamsFromURL,
  truncate,
} from "@dub/utils";
import { linkConstructorSimple } from "@dub/utils/src/functions/link-constructor";
import { waitUntil } from "@vercel/functions";
import { createId } from "../create-id";
import { combineTagIds } from "../tags/combine-tag-ids";
import { linkCache } from "./cache";
import { encodeKeyIfCaseSensitive } from "./case-sensitivity";
import { includeTags } from "./include-tags";
import { updateLinksUsage } from "./update-links-usage";
import { transformLink } from "./utils";

export async function createLink(link: ProcessedLinkProps) {
  let {
    key,
    url,
    expiresAt,
    title,
    description,
    image,
    proxy,
    geo,
    publicStats,
  } = link;

  const combinedTagIds = combineTagIds(link);

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  const { tagId, tagIds, tagNames, webhookIds, ...rest } = link;

  key = encodeKeyIfCaseSensitive({
    domain: link.domain,
    key,
  });

  const response = await prisma.link.create({
    data: {
      ...rest,
      id: createId({ prefix: "link_" }),
      key,
      shortLink: linkConstructorSimple({ domain: link.domain, key }),
      title: truncate(title, 120),
      description: truncate(description, 240),
      // if it's an uploaded image, make this null first because we'll update it later
      image: proxy && image && !isStored(image) ? null : image,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || Prisma.JsonNull,

      // Associate tags by tagNames
      ...(tagNames?.length &&
        link.projectId && {
          tags: {
            create: tagNames.map((tagName, idx) => ({
              tag: {
                connect: {
                  name_projectId: {
                    name: tagName,
                    projectId: link.projectId as string,
                  },
                },
              },
              createdAt: new Date(new Date().getTime() + idx * 100), // increment by 100ms for correct order
            })),
          },
        }),

      // Associate tags by IDs (takes priority over tagNames)
      ...(combinedTagIds &&
        combinedTagIds.length > 0 && {
          tags: {
            createMany: {
              data: combinedTagIds.map((tagId, idx) => ({
                tagId,
                createdAt: new Date(new Date().getTime() + idx * 100), // increment by 100ms for correct order
              })),
            },
          },
        }),

      // Webhooks
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

      // Shared dashboard
      ...(publicStats && {
        dashboard: {
          create: {
            id: createId({ prefix: "dash_" }),
            projectId: link.projectId,
            userId: link.userId,
          },
        },
      }),
    },
    include: {
      ...includeTags,
      webhooks: webhookIds ? true : false,
    },
  });

  const uploadedImageUrl = `${R2_URL}/images/${response.id}`;

  waitUntil(
    Promise.allSettled([
      // cache link in Redis
      linkCache.set(response),
      // record link in Tinybird
      recordLink(response),
      // Upload image to R2 and update the link with the uploaded image URL when
      // proxy is enabled and image is set and not stored in R2
      ...(proxy && image && !isStored(image)
        ? [
            // upload image to R2
            storage.upload(`images/${response.id}`, image, {
              width: 1200,
              height: 630,
            }),
            // update the null image we set earlier to the uploaded image URL
            prisma.link.update({
              where: {
                id: response.id,
              },
              data: {
                image: uploadedImageUrl,
              },
            }),
          ]
        : []),
      // delete public links after 30 mins
      !response.userId &&
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete`,
          // delete after 30 mins
          delay: 30 * 60,
          body: {
            linkId: response.id,
          },
        }),
      // update links usage for workspace
      link.projectId &&
        updateLinksUsage({
          workspaceId: link.projectId,
          increment: 1,
        }),

      webhookIds &&
        propagateWebhookTriggerChanges({
          webhookIds,
        }),
    ]),
  );

  return {
    ...transformLink(response),
    // optimistically set the image URL to the uploaded image URL
    image:
      proxy && image && !isStored(image) ? uploadedImageUrl : response.image,
  };
}
