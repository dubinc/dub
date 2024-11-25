import { queueDomainUpdate } from "@/lib/api/domains/queue";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  newDomain: z.string(),
  oldDomain: z.string(),
  workspaceId: z.string(),
  page: z.number(),
});

const pageSize = 100;

// POST /api/cron/domains/update
export async function POST(req: Request) {
  try {
    const body = await req.json();

    await verifyQstashSignature(req, body);

    const { newDomain, oldDomain, workspaceId, page } = schema.parse(body);

    const newDomainRecord = await prisma.domain.findUnique({
      where: {
        slug: newDomain,
      },
    });

    if (!newDomainRecord) {
      return new Response(`Domain ${newDomain} not found. Skipping update...`);
    }

    const links = await prisma.link.findMany({
      where: {
        domain: newDomain,
      },
      include: {
        tags: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    if (links.length === 0) {
      return new Response("No more links to update. Exiting...");
    }

    await Promise.all([
      // rename redis keys
      linkCache.rename({
        links,
        oldDomain,
      }),

      // update links in Tinybird
      recordLink(
        links.map((link) => ({
          link_id: link.id,
          domain: link.domain,
          key: link.key,
          url: link.url,
          tag_ids: link.tags.map((tag) => tag.tagId),
          program_id: link.programId ?? "",
          workspace_id: link.projectId,
          created_at: link.createdAt,
        })),
      ),
    ]);

    await queueDomainUpdate({
      workspaceId,
      oldDomain,
      newDomain,
      page: page + 1,
      delay: 2,
    });

    return new Response("Domain's links updated.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
