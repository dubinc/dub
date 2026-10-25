import { getOwnedLinkImageKey } from "@/lib/api/links/get-owned-link-image-key";
import { prisma } from "@/lib/prisma";
import { isNotHostedImage, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkProps, ProcessedLinkProps } from "@/lib/types";
import {
  R2_URL,
  getParamsFromURL,
  linkConstructorSimple,
  nanoid,
  truncate,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { createId } from "../create-id";
import { combineTagIds } from "../tags/combine-tag-ids";
import { scheduleABTestCompletion } from "./ab-test-scheduler";
import { linkCache } from "./cache";
import { encodeKeyIfCaseSensitive } from "./case-sensitivity";
import { includeTags } from "./include-tags";
import { transformLink } from "./utils";

export async function updateLink({
  oldLink,
  updatedLink,
}: {
  oldLink: {
    domain: string;
    key: string;
    image?: string | null;
    testCompletedAt?: Date | null;
  };
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
    testVariants,
    testStartedAt,
    testCompletedAt,
    ...rest
  } = updatedLink;

  const changedTestCompletedAt = testCompletedAt !== oldLink.testCompletedAt;

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
        proxy && image && isNotHostedImage(image)
          ? `${R2_URL}/images/${id}_${imageUrlNonce}`
          : image,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_term: utm_term || null,
      utm_content: utm_content || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || Prisma.DbNull,

      testVariants: testVariants || Prisma.DbNull,
      testCompletedAt: testCompletedAt ? new Date(testCompletedAt) : null,
      testStartedAt: testStartedAt ? new Date(testStartedAt) : null,

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

  const previousImageKey =
    oldLink.image && oldLink.image !== image
      ? getOwnedLinkImageKey(oldLink.image, id)
      : null;

  waitUntil(
    (async () => {
      await Promise.allSettled([
        // Record link in Redis
        linkCache.set(response),

        // Record link in Tinybird
        recordLink(response),

        // If key is changed: delete the old key in Redis
        (changedDomain || changedKey) && linkCache.delete(oldLink),

        // If proxy is true and image is not stored in R2, upload image to R2
        proxy &&
          image &&
          isNotHostedImage(image) &&
          storage.upload({
            key: `images/${id}_${imageUrlNonce}`,
            body: image,
            opts: {
              width: 1200,
              height: 630,
            },
          }),

        // Delete the previous preview image when it belongs to this link and is being replaced.
        previousImageKey && storage.delete({ key: previousImageKey }),

        // Schedule AB test completion
        changedTestCompletedAt &&
          testVariants &&
          testCompletedAt &&
          scheduleABTestCompletion(response),
      ]);
    })(),
  );

  return transformLink(response);
}
