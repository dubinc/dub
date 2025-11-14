import { queueDomainUpdate } from "@/lib/api/domains/queue-domain-update";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { linkConstructorSimple } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  newDomain: z.string(),
  oldDomain: z.string(),
  startingAfter: z.string().optional(),
});

const LINK_BATCH_SIZE = 100;

// POST /api/cron/domains/update
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { newDomain, oldDomain, startingAfter } = schema.parse(
      JSON.parse(rawBody),
    );

    const newDomainRecord = await prisma.domain.findUnique({
      where: {
        slug: newDomain,
      },
    });

    if (!newDomainRecord) {
      return logAndRespond(`Domain ${newDomain} not found. Skipping...`);
    }

    const linksToUpdate = await prisma.link.findMany({
      where: {
        domain: oldDomain,
      },
      take: LINK_BATCH_SIZE,
      ...(startingAfter && {
        skip: 1,
        cursor: {
          id: startingAfter,
        },
      }),
      orderBy: {
        id: "asc",
      },
    });

    if (linksToUpdate.length === 0) {
      return logAndRespond(
        `No more links to update for domain ${oldDomain}. Exiting...`,
      );
    }

    const linkIdsToUpdate = linksToUpdate.map((link) => link.id);

    try {
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
    } catch (error) {
      console.error(error);
    }

    const updatedLinks = await prisma.link.findMany({
      where: {
        id: {
          in: linkIdsToUpdate,
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
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

    const response = await queueDomainUpdate({
      newDomain,
      oldDomain,
      startingAfter: linksToUpdate[linksToUpdate.length - 1].id,
      delay: 1,
    });

    if (response.messageId) {
      return logAndRespond(`Scheduled next batch ${response.messageId}.`);
    } else {
      return logAndRespond("Error scheduling next batch.");
    }
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
