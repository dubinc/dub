import { queueDomainUpdate } from "@/lib/api/domains/queue";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
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
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { newDomain, oldDomain, workspaceId, page } = schema.parse(
      JSON.parse(rawBody),
    );

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
        tags: {
          select: {
            tag: true,
          },
        },
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
      recordLink(links),
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
