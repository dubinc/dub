import prisma from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkWithTagIdsProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  SHORT_DOMAIN,
  getParamsFromURL,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { combineTagIds } from "./utils";

export async function editLink({
  oldDomain = SHORT_DOMAIN,
  oldKey,
  updatedLink,
}: {
  oldDomain?: string;
  oldKey: string;
  updatedLink: LinkWithTagIdsProps;
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

  const [response, ..._effects] = await Promise.all([
    prisma.link.update({
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
        tags: {
          deleteMany: {
            tagId: {
              notIn: combinedTagIds,
            },
          },
          connectOrCreate: combinedTagIds.map((tagId) => ({
            where: { linkId_tagId: { linkId: id, tagId } },
            create: { tagId },
          })),
        },
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
    }),
    // record link in Redis
    redis.hset(updatedLink.domain, {
      [updatedLink.key.toLowerCase()]: await formatRedisLink(updatedLink),
    }),
    // record link in Tinybird
    recordLink({
      link: {
        ...updatedLink,
        tags: combinedTagIds.map((tagId) => ({
          tagId,
        })),
      },
    }),
    // if key is changed: delete the old key in Redis
    (changedDomain || changedKey) &&
      redis.hdel(oldDomain, oldKey.toLowerCase()),
  ]);

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });

  const tags = response.tags.map(({ tag }) => tag);

  return {
    ...response,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    workspaceId: `ws_${response.projectId}`,
  };
}
