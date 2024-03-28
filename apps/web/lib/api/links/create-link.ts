import { qstash } from "@/lib/cron";
import prisma from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird";
import { LinkWithTagIdsProps } from "@/lib/types";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  APP_DOMAIN_WITH_NGROK,
  getParamsFromURL,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { combineTagIds, dubLinkChecks } from "./utils";

export async function createLink(link: LinkWithTagIdsProps) {
  let { key, url, expiresAt, title, description, image, proxy, geo } = link;

  const combinedTagIds = combineTagIds(link);

  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    getParamsFromURL(url);

  const { tagId, tagIds, ...rest } = link;

  const response = await prisma.link.create({
    data: {
      ...rest,
      key,
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
      ...(combinedTagIds.length > 0 && {
        tags: {
          createMany: {
            data: combinedTagIds.map((tagId) => ({ tagId })),
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
    },
  });

  const uploadedImageUrl = `${process.env.STORAGE_BASE_URL}/images/${response.id}`;

  await Promise.all([
    // record link in Redis
    redis.hset(link.domain, {
      [link.key.toLowerCase()]: await formatRedisLink(response),
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
    // if proxy image is set, upload image to R2 and update the link with the uploaded image URL
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
      prisma.project.update({
        where: {
          id: link.projectId,
        },
        data: {
          linksUsage: {
            increment: 1,
          },
        },
      }),
    // if the link is a dub.sh link, do some checks
    link.domain === "dub.sh" && dubLinkChecks(link),
  ]);

  const shortLink = linkConstructor({
    domain: response.domain,
    key: response.key,
  });
  const tags = response.tags.map(({ tag }) => tag);
  return {
    ...response,
    // optimistically set the image URL to the uploaded image URL
    image:
      proxy && image && !isStored(image) ? uploadedImageUrl : response.image,
    tagId: tags?.[0]?.id ?? null, // backwards compatibility
    tags,
    shortLink,
    qrCode: `https://api.dub.co/qr?url=${shortLink}`,
    workspaceId: `ws_${response.projectId}`,
  };
}
