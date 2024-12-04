import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkProps, ProcessedLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { Prisma, prisma } from "@dub/prisma";
import {
  R2_URL,
  getParamsFromURL,
  linkConstructorSimple,
  nanoid,
  truncate,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { combineTagIds } from "../tags/combine-tag-ids";
import { createId } from "../utils";
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

  const response = await prisma.link.update({
    where: {
      id,
    },
    data: {
      ...rest,
      key,
      shortLink: linkConstructorSimple({
        domain: updatedLink.domain,
        key: updatedLink.key,
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
            showConversions: updatedLink.trackConversion,
            projectId: updatedLink.projectId,
            userId: updatedLink.userId,
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
        orderBy: {
          createdAt: "asc",
        },
      },
      webhooks: webhookIds ? true : false,
    },
  });

  waitUntil(
    Promise.all([
      // record link in Redis
      redis.hset(updatedLink.domain.toLowerCase(), {
        [updatedLink.key.toLowerCase()]: await formatRedisLink(response),
      }),
      // record link in Tinybird
      recordLink({
        link_id: response.id,
        domain: response.domain,
        key: response.key,
        url: response.url,
        tag_ids: response.tags.map(({ tag }) => tag.id),
        program_id: response.programId ?? "",
        workspace_id: response.projectId,
        created_at: response.createdAt,
      }),
      // if key is changed: delete the old key in Redis
      (changedDomain || changedKey) &&
        redis.hdel(oldLink.domain.toLowerCase(), oldLink.key.toLowerCase()),
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
    ]),
  );

  return transformLink(response);
}
