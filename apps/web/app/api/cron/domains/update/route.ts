import { queueDomainUpdate } from "@/lib/api/domains/queue";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  newDomain: z.string(),
  oldDomain: z.string(),
});

// POST /api/cron/domains/update
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { newDomain, oldDomain } = schema.parse(JSON.parse(rawBody));

    const newDomainRecord = await prisma.domain.findUnique({
      where: {
        slug: newDomain,
      },
    });

    if (!newDomainRecord) {
      return new Response(`Domain ${newDomain} not found. Skipping update...`);
    }

    for (let i = 0; i < 5; i++) {
      const links = await prisma.link.findMany({
        where: {
          domain: oldDomain,
        },
        take: 100,
      });

      if (links.length === 0) {
        return new Response("No more links to update. Exiting...");
      }

      const linkIds = links.map((link) => link.id);

      await prisma.link.updateMany({
        where: {
          id: {
            in: linkIds,
          },
        },
        data: {
          domain: newDomain,
        },
      });

      const updatedLinks = await prisma.link.findMany({
        where: {
          id: {
            in: linkIds,
          },
        },
        include: {
          tags: {
            select: {
              tag: true,
            },
          },
        },
      });

      await Promise.all([
        linkCache.rename({
          links: updatedLinks,
          oldDomain,
        }),

        recordLink(updatedLinks),

        // Trigger a new cron job to update the link.shortLink column for those links
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/update-shortlinks`,
          body: {
            linkIds,
          },
        }),
      ]);
    }

    await queueDomainUpdate({
      newDomain,
      oldDomain,
      delay: 1,
    });

    return new Response("Domain's links updated.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
