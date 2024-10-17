import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK, R2_URL } from "@dub/utils";
import { storage } from "../storage";
import { recordLink } from "../tinybird";
import { qstash } from "./index";

export const triggerLinksCleanupJob = async ({
  workspaceId,
  linkId,
  domain,
}: {
  workspaceId: string;
  linkId?: string;
  domain?: string;
}) => {
  return await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/cleanup`,
    body: {
      workspaceId,
      ...(linkId && { linkId }),
      ...(domain && { domain }),
    },
  });
};

// Cleanup a single link
export const cleanupLink = async ({
  workspaceId,
  linkId,
}: {
  workspaceId: string;
  linkId: string;
}) => {
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      id: linkId,
    },
    include: {
      tags: true,
    },
  });

  await Promise.allSettled([
    // Record link in the Tinybird
    recordLink({
      link_id: link.id,
      domain: link.domain,
      key: link.key,
      url: link.url,
      tag_ids: link.tags.map((tag) => tag.id),
      workspace_id: workspaceId,
      created_at: link.createdAt,
      deleted: true,
    }),

    // Remove image from R2 storage if it exists
    ...(link.image && link.image.startsWith(R2_URL)
      ? [storage.delete(link.image.replace(R2_URL, ""))]
      : []),

    // Remove the link from Redis
    redis.del(`${link.domain}:${link.key}`.toLowerCase()),

    // Remove the link from MySQL
    prisma.link.delete({
      where: {
        id: link.id,
      },
    }),
  ]);
};

// Cleanup many links
export const cleanupManyLinks = async ({
  workspaceId,
  linkIds,
}: {
  workspaceId: string;
  linkIds: string[];
}) => {
  const links = await prisma.link.findMany({
    where: {
      id: { in: linkIds },
    },
    include: {
      tags: true,
    },
  });

  if (links.length === 0) {
    return;
  }

  const pipeline = redis.pipeline();

  links.forEach((link) => {
    pipeline.del(`${link.domain}:${link.key}`.toLowerCase());
  });

  await Promise.allSettled([
    // Record link in the Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.id),
        workspace_id: workspaceId,
        created_at: link.createdAt,
        deleted: true,
      })),
    ),

    // Remove image from R2 storage if it exists
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Remove the link from Redis
    pipeline.exec(),

    // Remove the link from MySQL
    prisma.link.deleteMany({
      where: {
        id: { in: linkIds },
      },
    }),
  ]);
};

// Cleanup all links for a domain
export const cleanupDomainAndLinks = async ({
  workspaceId,
  domain,
}: {
  workspaceId: string;
  domain: string;
}) => {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    include: {
      tags: true,
    },
    take: 100,
  });

  if (links.length === 0) {
    return;
  }

  const pipeline = redis.pipeline();

  links.forEach((link) => {
    pipeline.del(`${link.domain}:${link.key}`.toLowerCase());
  });

  await Promise.allSettled([
    // Record link in the Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.id),
        workspace_id: workspaceId,
        created_at: link.createdAt,
        deleted: true,
      })),
    ),

    // Remove image from R2 storage if it exists
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Remove the link from Redis
    pipeline.exec(),

    // Remove the link from MySQL
    prisma.link.deleteMany({
      where: {
        id: { in: links.map((link) => link.id) },
      },
    }),
  ]);

  // Find if there are any remaining links for the domain
  const remainingLinks = await prisma.link.count({
    where: {
      domain,
    },
  });

  if (remainingLinks > 0) {
    await triggerLinksCleanupJob({
      workspaceId,
      domain,
    });
  } else {
    await prisma.domain.delete({
      where: {
        slug: domain,
      },
    });
  }
};
