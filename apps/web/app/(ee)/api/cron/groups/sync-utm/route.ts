import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { includeTags } from "@/lib/api/links/include-tags";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  chunk,
  constructURLFromUTMParams,
  isFulfilled,
  log,
} from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const MAX_BATCH = 10;

const schema = z.object({
  utmTemplateId: z.string(),
  cursor: z.string().optional(),
});

/**
 * Syncs UTM parameters from a UTM template to all partner links in a group.
 * This job is triggered when a UTM template associated with a partner group is updated.
 */

// POST /api/cron/groups/sync-utm
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { utmTemplateId, cursor } = schema.parse(JSON.parse(rawBody));

    // Find the UTM template
    const utmTemplate = await prisma.utmTemplate.findUnique({
      where: {
        id: utmTemplateId,
      },
      include: {
        partnerGroup: true,
      },
    });

    if (!utmTemplate) {
      return logAndRespond(
        `UTM template ${utmTemplateId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    const { partnerGroup: group } = utmTemplate;

    if (!group) {
      return logAndRespond(
        `UTM template ${utmTemplateId} doesn't associate with a group. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    let hasMore = true;
    let currentCursor = cursor;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      // Find partners in the group
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          ...(currentCursor && {
            id: {
              gt: currentCursor,
            },
          }),
          groupId: group.id,
        },
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
        include: {
          links: true,
        },
      });

      if (programEnrollments.length === 0) {
        hasMore = false;
        break;
      }

      // Extract links from the program enrollments
      const links = programEnrollments.flatMap((enrollment) =>
        enrollment.links.map((link) => link),
      );

      const linkChunks = chunk(links, 100);

      const utmParams = {
        utm_source: utmTemplate.utm_source || "",
        utm_medium: utmTemplate.utm_medium || "",
        utm_campaign: utmTemplate.utm_campaign || "",
        utm_term: utmTemplate.utm_term || "",
        utm_content: utmTemplate.utm_content || "",
        ref: utmTemplate.ref || "",
      };

      // Update the UTM for each partner links in the group
      for (const linkChunk of linkChunks) {
        const processedLinks = await Promise.all(
          linkChunk.map((link) => ({
            id: link.id,
            url: constructURLFromUTMParams(link.url, utmParams),
            utm_source: utmTemplate.utm_source || null,
            utm_medium: utmTemplate.utm_medium || null,
            utm_campaign: utmTemplate.utm_campaign || null,
            utm_term: utmTemplate.utm_term || null,
            utm_content: utmTemplate.utm_content || null,
          })),
        );

        // Bulk update the links
        const updatedLinkPromises = await Promise.allSettled(
          processedLinks.map((link) =>
            prisma.link.update({
              where: {
                id: link.id,
              },
              data: link,
              include: includeTags,
            }),
          ),
        );

        const updatedLinks = updatedLinkPromises
          .filter(isFulfilled)
          .map(({ value }) => value);

        await Promise.allSettled([
          recordLink(updatedLinks),
          linkCache.expireMany(updatedLinks),
        ]);
      }

      // Update cursor to the last processed record
      currentCursor = programEnrollments[programEnrollments.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/sync-utm`,
        method: "POST",
        body: {
          utmTemplateId,
          cursor: currentCursor,
        },
      });
    }

    return logAndRespond(`Finished syncing UTM for the partner's links.`);
  } catch (error) {
    await log({
      message: `Error updating UTM for the partner's links: ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
