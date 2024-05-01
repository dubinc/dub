import prisma from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkProps, ProcessedLinkProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import { SHORT_DOMAIN, getParamsFromURL, truncate } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { combineTagIds, transformLink } from "./utils";

export async function updateLink({
  oldDomain = SHORT_DOMAIN,
  oldKey,
  updatedLink,
}: {
  oldDomain?: string;
  oldKey: string;
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
  } = updatedLink;
  const changedKey = key.toLowerCase() !== oldKey.toLowerCase();
  const changedDomain = domain !== oldDomain;

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
    ...rest
  } = updatedLink;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  if (proxy && image && !isStored(image)) {
    // only upload image if proxy is true and image is not stored in R2
    await storage.upload(`images/${id}`, image, {
      width: 1200,
      height: 630,
    });
  }

  const response = await prisma.link.update({
    where: {
      id,
    },
    data: {
      ...rest,
      key,
      title: truncate(title, 120),
      description: truncate(description, 240),
      image:
        proxy && image && !isStored(image)
          ? `${process.env.STORAGE_BASE_URL}/images/${id}`
          : image,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      geo: geo || Prisma.JsonNull,

      // Associate tags by tagNames
      ...(tagNames &&
        updatedLink.projectId && {
          tags: {
            deleteMany: {},
            create: tagNames.map((tagName) => ({
              tag: {
                connect: {
                  name_projectId: {
                    name: tagName,
                    projectId: updatedLink.projectId as string,
                  },
                },
              },
            })),
          },
        }),

      // Associate tags by IDs (takes priority over tagNames)
      ...(combinedTagIds && {
        tags: {
          deleteMany: {},
          create: combinedTagIds.map((tagId) => ({
            tagId,
          })),
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
    },
  });

  await Promise.all([
    // record link in Redis
    redis.hset(updatedLink.domain.toLowerCase(), {
      [updatedLink.key.toLowerCase()]: await formatRedisLink(response),
    }),
    // record link in Tinybird
    recordLink({
      link: {
        ...response,
        tags: response.tags.map(({ tag }) => ({
          tagId: tag.id,
        })),
      },
    }),
    // if key is changed: delete the old key in Redis
    (changedDomain || changedKey) &&
      redis.hdel(oldDomain.toLowerCase(), oldKey.toLowerCase()),
  ]);

  return transformLink(response);
}
