import { queueDomainDeletion } from "@/lib/api/domains/queue";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { storage } from "@/lib/storage";
import { recordLink } from "@/lib/tinybird/record-link";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  domain: z.string(),
  workspaceId: z.string(),
});

// POST /api/cron/domains/delete
export async function POST(req: Request) {
  try {
    const body = await req.json();

    await verifyQstashSignature(req, body);

    const { domain, workspaceId } = schema.parse(body);

    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: domain,
      },
    });

    if (!domainRecord) {
      return new Response(`Domain ${domain} not found. Skipping...`);
    }

    const links = await prisma.link.findMany({
      where: {
        domain,
      },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
      take: 100, // TODO: We can adjust this number based on the performance
    });

    if (links.length === 0) {
      return new Response("No more links to delete. Exiting...");
    }

    const response = await Promise.allSettled([
      // Remove the link from Redis
      linkCache.deleteMany(links),

      // Record link in the Tinybird
      recordLink(links),

      // Remove image from R2 storage if it exists
      links
        .filter((link) => link.image?.startsWith(`${R2_URL}/images/${link.id}`))
        .map((link) => storage.delete(link.image!.replace(`${R2_URL}/`, ""))),

      // Remove the link from MySQL
      prisma.link.deleteMany({
        where: {
          id: { in: links.map((link) => link.id) },
        },
      }),
    ]);

    console.log(response);

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

    console.log("remainingLinks", remainingLinks);

    if (remainingLinks > 0) {
      await queueDomainDeletion({
        workspaceId,
        domain,
        delay: 2,
      });
      return new Response(
        `Deleted ${links.length} links, ${remainingLinks} remaining. Starting next batch...`,
      );
    }

    // After all links are deleted, delete the domain and image
    await Promise.all([
      prisma.domain.delete({
        where: {
          slug: domain,
        },
      }),
      domainRecord.logo &&
        storage.delete(domainRecord.logo.replace(`${R2_URL}/`, "")),
    ]);

    return new Response(
      `Deleted ${links.length} links, no more links remaining. Domain deleted.`,
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
