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
import { combineTagIds, keyChecks, processKey } from "./utils";

export async function deleteLink(linkId: string) {
  const link = await prisma.link.delete({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });
  return await Promise.allSettled([
    // if the image is stored in Cloudflare R2, delete it
    link.proxy &&
      link.image?.startsWith(process.env.STORAGE_BASE_URL as string) &&
      storage.delete(`images/${link.id}`),
    redis.hdel(link.domain, link.key.toLowerCase()),
    recordLink({ link, deleted: true }),
    link.projectId &&
      prisma.project.update({
        where: {
          id: link.projectId,
        },
        data: {
          linksUsage: {
            decrement: 1,
          },
        },
      }),
  ]);
}
