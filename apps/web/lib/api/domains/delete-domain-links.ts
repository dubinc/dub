import { prisma } from "@/lib/prisma";
import { R2_URL } from "@dub/utils";
import { storage } from "../../storage";
import { recordLink } from "../../tinybird";
import { linkCache } from "../links/cache";
import { queueDomainDeletion } from "./queue";
import { removeDomainFromVercel } from "./remove-domain-vercel";

// Delete a domain and all links & images associated with it
export async function deleteDomainAndLinks({
  domain,
  workspaceId,
}: {
  domain: string;
  workspaceId: string;
}) {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    include: {
      tags: true,
    },
    take: 100, // TODO: We can adjust this number based on the performance
  });

  if (links.length === 0) {
    return;
  }

  const response = await Promise.allSettled([
    // Record link in the Tinybird
    recordLink(
      links.map((link) => ({
        link_id: link.id,
        domain: link.domain,
        key: link.key,
        url: link.url,
        tag_ids: link.tags.map((tag) => tag.id),
        workspace_id: workspaceId,
        program_id: link.programId ?? "",
        created_at: link.createdAt,
        deleted: true,
      })),
    ),

    // Remove image from R2 storage if it exists
    links
      .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
      .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

    // Remove the link from Redis
    linkCache.deleteMany(links),

    // Remove the link from MySQL
    prisma.link.deleteMany({
      where: {
        id: { in: links.map((link) => link.id) },
      },
    }),
  ]);

  response.forEach((promise) => {
    if (promise.status === "rejected") {
      console.error("deleteDomainAndLinks", {
        reason: promise.reason,
        domain,
        workspaceId,
      });
    }
  });

  const remainingLinks = await prisma.link.count({
    where: {
      domain,
    },
  });

  if (remainingLinks > 0) {
    return await queueDomainDeletion({
      workspaceId,
      domain,
      delay: 2,
    });
  }

  // After all links are deleted, delete the domain
  await prisma.domain.delete({
    where: {
      slug: domain,
    },
  });
}

// Mark the domain as deleted
// We'll delete the domain and its links via a cron job
export async function markDomainAsDeleted({
  domain,
  workspaceId,
  delay,
}: {
  domain: string;
  workspaceId: string;
  delay?: number; // delay the cron job to avoid hitting rate limits
}) {
  const links = await prisma.link.updateMany({
    where: {
      domain,
    },
    data: {
      projectId: null,
    },
  });

  const response = await Promise.allSettled([
    removeDomainFromVercel(domain),

    prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        projectId: null,
      },
    }),

    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        linksUsage: {
          decrement: links.count,
        },
      },
    }),
  ]);

  await queueDomainDeletion({
    workspaceId,
    domain,
    delay,
  });

  response.forEach((promise) => {
    if (promise.status === "rejected") {
      console.error("markDomainAsDeleted", {
        reason: promise.reason,
        domain,
        workspaceId,
      });
    }
  });
}
