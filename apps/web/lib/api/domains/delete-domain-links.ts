import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN_WITH_NGROK, R2_URL } from "@dub/utils";
import { storage } from "../../storage";
import { recordLink } from "../../tinybird";
import { deleteDomain } from "./delete-domain";

// Delete a domain and all links & images associated with it
export const deleteDomainAndLinks = async ({
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
    take: 500,
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

  const remainingLinks = await prisma.link.count({
    where: {
      domain,
    },
  });

  if (remainingLinks > 0) {
    return await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/cleanup`,
      delay: 2,
      body: {
        workspaceId,
        domain,
      },
    });
  }

  await deleteDomain(domain);
};
