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

export async function getLinksCount({
  searchParams,
  workspaceId,
  userId,
}: {
  searchParams: z.infer<typeof getLinksCountQuerySchema>;
  workspaceId: string;
  userId?: string | null;
}) {
  const { groupBy, search, domain, tagId, tagIds, showArchived, withTags } =
    searchParams;

  const combinedTagIds = combineTagIds({ tagId, tagIds });

  const linksWhere = {
    projectId: workspaceId,
    archived: showArchived ? undefined : false,
    ...(userId && { userId }),
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
    // when filtering by domain, only filter by domain if the filter group is not "Domains"
    ...(domain &&
      groupBy !== "domain" && {
        domain,
      }),
  };

  if (groupBy === "tagId") {
    return await prisma.linkTag.groupBy({
      by: ["tagId"],
      where: {
        link: linksWhere,
      },
      _count: true,
      orderBy: {
        _count: {
          tagId: "desc",
        },
      },
    });
  } else {
    const where = {
      ...linksWhere,
      ...(withTags && {
        tags: {
          some: {},
        },
      }),
      ...(combinedTagIds.length > 0 && {
        tags: {
          some: {
            tagId: {
              in: tagIds,
            },
          },
        },
      }),
    };

    if (groupBy === "domain") {
      return await prisma.link.groupBy({
        by: [groupBy],
        where,
        _count: true,
        orderBy: {
          _count: {
            [groupBy]: "desc",
          },
        },
      });
    } else {
      return await prisma.link.count({
        where,
      });
    }
  }
}
