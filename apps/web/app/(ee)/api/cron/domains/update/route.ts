import { queueDomainUpdate } from "@/lib/api/domains/queue";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { linkConstructorSimple } from "@dub/utils";
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

    const linksToUpdate = await prisma.link.findMany({
      where: {
        domain: oldDomain,
      },
      take: 100,
      orderBy: {
        createdAt: "desc",
      },
    });

    if (linksToUpdate.length === 0) {
      return new Response("No more links to update. Exiting...");
    }

    const linkIdsToUpdate = linksToUpdate.map((link) => link.id);

    await prisma.link.updateMany({
      where: {
        id: {
          in: linkIdsToUpdate,
        },
      },
      data: {
        domain: newDomain,
      },
    });

    const updatedLinks = await prisma.link.findMany({
      where: {
        id: {
          in: linkIdsToUpdate,
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

    await Promise.allSettled([
      // update the `shortLink` field for each of the short links
      updateShortLinks(updatedLinks),
      // record new link values in Tinybird (dub_links_metadata)
      recordLink(updatedLinks),
      // expire the redis cache for the old links
      linkCache.expireMany(linksToUpdate),
    ]);

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

// Update the shortLink column for a list of links
const updateShortLinks = async (
  links: Pick<Link, "id" | "domain" | "key">[],
) => {
  if (!links || links.length === 0) {
    return new Response("No links found.");
  }

  for (const link of links) {
    await prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        shortLink: linkConstructorSimple({
          domain: link.domain,
          key: link.key,
        }),
      },
    });
  }
};
