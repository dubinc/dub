import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkProps, ProcessedLinkProps } from "@/lib/types";
import { propagateWebhookTriggerChanges } from "@/lib/webhook/update-webhook";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import {
  R2_URL,
  getParamsFromURL,
  linkConstructorSimple,
  nanoid,
  truncate,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { createId } from "../create-id";
import { combineTagIds } from "../tags/combine-tag-ids";
import { linkCache } from "./cache";
import { encodeKeyIfCaseSensitive } from "./case-sensitivity";
import { includeTags } from "./include-tags";
import { transformLink } from "./utils";

export async function updateLink({
  oldLink,
  updatedLink,
}: {
  oldLink: { domain: string; key: string; image?: string | null };
  updatedLink: ProcessedLinkProps &
    Pick<LinkProps, "id" | "clicks" | "lastClicked" | "updatedAt">;
}) {
  let {
    id,
    domain,
    key,
    url,
    expiresAt,
    title,
    description,
    image,
    proxy,
    geo,
    publicStats,
  } = updatedLink;
  const changedKey = key.toLowerCase() !== oldLink.key.toLowerCase();
  const changedDomain = domain !== oldLink.domain;

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  // exclude fields that should not be updated
  const {
    id: _,
    clicks,
    lastClicked,
    updatedAt,
    tagId,
    tagIds,
    tagNames,
    webhookIds,
    ...rest
  } = updatedLink;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const imageUrlNonce = nanoid(7);

  key = encodeKeyIfCaseSensitive({
    domain: updatedLink.domain,
    key: updatedLink.key,
  });

  const response = await prisma.link.update({
    where: {
      id,
    },
    data: {
      ...rest,
      key,
      shortLink: linkConstructorSimple({
        domain: updatedLink.domain,
        key,
      }),
      title: truncate(title, 120),
      description: truncate(description, 240),
      image:
        proxy && image && !isStored(image)
          ? `${R2_URL}/images/${id}_${imageUrlNonce}`
          : image,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || Prisma.JsonNull,

      // Associate tags by tagNames
      ...(tagNames &&
        updatedLink.projectId && {
          tags: {
            deleteMany: {},
            create: tagNames.map((tagName, idx) => ({
              tag: {
                connect: {
                  name_projectId: {
                    name: tagName,
                    projectId: updatedLink.projectId as string,
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

      // Webhooks
      ...(webhookIds && {
        webhooks: {
          deleteMany: {},
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
            projectId: updatedLink.projectId,
            userId: updatedLink.userId,
          },
        },
      }),
    },
    include: {
      ...includeTags,
      webhooks: webhookIds ? true : false,
    },
  });

  waitUntil(
    Promise.allSettled([
      // record link in Redis
      linkCache.set(response),

      // record link in Tinybird
      recordLink(response),

      // if key is changed: delete the old key in Redis
      (changedDomain || changedKey) && linkCache.delete(oldLink),

      // if proxy is true and image is not stored in R2, upload image to R2
      proxy &&
        image &&
        !isStored(image) &&
        storage.upload(`images/${id}_${imageUrlNonce}`, image, {
          width: 1200,
          height: 630,
        }),
      // if there's a valid old image and it starts with the same link ID but is different from the new image, delete it
      oldLink.image &&
        oldLink.image.startsWith(`${R2_URL}/images/${id}`) &&
        oldLink.image !== image &&
        storage.delete(oldLink.image.replace(`${R2_URL}/`, "")),

      webhookIds != undefined &&
        propagateWebhookTriggerChanges({
          webhookIds,
        }),
    ]),
  );

  return transformLink(response);
}
