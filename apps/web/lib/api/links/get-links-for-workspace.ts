import {
  isBlacklistedDomain,
  isBlacklistedKey,
  isReservedKey,
  isReservedUsername,
} from "@/lib/edge-config";
import prisma from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { formatRedisLink, redis } from "@/lib/upstash";
import {
  getLinksCountQuerySchema,
  getLinksQuerySchema,
} from "@/lib/zod/schemas/links";
import {
  APP_DOMAIN_WITH_NGROK,
  DEFAULT_REDIRECTS,
  DUB_DOMAINS,
  SHORT_DOMAIN,
  getDomainWithoutWWW,
  getParamsFromURL,
  getUrlFromString,
  isDubDomain,
  isValidUrl,
  linkConstructor,
  truncate,
  validKeyRegex,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { checkIfKeyExists, getRandomKey } from "@/lib/planetscale";
import { recordLink } from "@/lib/tinybird";
import {
  LinkProps,
  LinkWithTagIdsProps,
  RedisLinkProps,
  WorkspaceProps,
} from "@/lib/types";
import z from "@/lib/zod";
import { qstash } from "@/lib/cron";
import { combineTagIds } from "./utils";

export async function getLinksForWorkspace({
  workspaceId,
  domain,
  tagId,
  tagIds,
  search,
  sort = "createdAt",
  page,
  userId,
  showArchived,
  withTags,
}: z.infer<typeof getLinksQuerySchema> & {
  workspaceId: string;
}) {
  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const links = await prisma.link.findMany({
    where: {
      projectId: workspaceId,
      archived: showArchived ? undefined : false,
      ...(domain && { domain }),
      ...(search && {
        OR: [
          {
            key: { contains: search },
          },
          {
            url: { contains: search },
          },
        ],
      }),
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(combinedTagIds.length > 0 && {
        tags: { some: { tagId: { in: combinedTagIds } } },
      }),
      ...(userId && { userId }),
    },
    include: {
      user: true,
      tags: {
        include: {
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
    orderBy: {
      [sort]: "desc",
    },
    take: 100,
    ...(page && {
      skip: (page - 1) * 100,
    }),
  });

  return links.map((link) => {
    const shortLink = linkConstructor({
      domain: link.domain,
      key: link.key,
    });

    const tags = link.tags.map(({ tag }) => tag);

    return {
      ...link,
      tagId: tags?.[0]?.id ?? null, // backwards compatibility
      tags,
      shortLink,
      qrCode: `https://api.dub.co/qr?url=${shortLink}`,
      workspaceId: `ws_${link.projectId}`,
    };
  });
}
