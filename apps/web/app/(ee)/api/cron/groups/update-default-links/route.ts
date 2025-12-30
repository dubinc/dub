import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  log,
} from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;
const MAX_BATCH = 10;

const schema = z.object({
  defaultLinkId: z.string(),
  cursor: z.string().optional(),
});

/**
 * Cron job to update existing partner links when a group's default link configuration changes.
 *
 * For each link associated with a default link, it updates the domain and URL
 * to match the new default link configuration while preserving UTM parameters.
 *
 * It processes up to MAX_BATCH * PAGE_SIZE links per execution
 * and schedules additional jobs if needed.
 */

// POST /api/cron/groups/update-default-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { defaultLinkId, cursor } = schema.parse(JSON.parse(rawBody));

    // Find the default link
    const defaultLink = await prisma.partnerGroupDefaultLink.findUnique({
      where: {
        id: defaultLinkId,
      },
      include: {
        partnerGroup: {
          include: {
            utmTemplate: true,
          },
        },
      },
    });

    if (!defaultLink) {
      return logAndRespond(
        `Default link ${defaultLinkId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    const group = defaultLink.partnerGroup;

    if (!group) {
      return logAndRespond(
        `Group ${defaultLink.groupId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    console.info(
      `Updating default links for the partners (defaultLinkId=${defaultLink.id}, groupId=${group.id}).`,
    );

    let hasMore = true;
    let currentCursor = cursor;
    let processedBatches = 0;

    while (processedBatches < MAX_BATCH) {
      const linksToUpdate = await prisma.link.findMany({
        where: {
          ...(currentCursor && {
            id: {
              gt: currentCursor,
            },
          }),
          partnerGroupDefaultLinkId: defaultLink.id,
        },
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
      });

      if (linksToUpdate.length === 0) {
        hasMore = false;
        break;
      }

      const updatedLinks = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToUpdate.map((link) => link.id),
          },
        },
        data: {
          url: constructURLFromUTMParams(
            defaultLink.url,
            extractUtmParams(group.utmTemplate),
          ),
          ...extractUtmParams(group.utmTemplate, { excludeRef: true }),
        },
      });

      console.log(
        `Updated ${updatedLinks.count} links with url=${defaultLink.url} (via defaultLinkId=${defaultLink.id})`,
      );

      await linkCache.expireMany(linksToUpdate);

      // Update cursor to the last processed record
      currentCursor = linksToUpdate[linksToUpdate.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
        method: "POST",
        body: {
          defaultLinkId,
          cursor: currentCursor,
        },
      });
    }

    return logAndRespond(`Finished updating default links for the partners.`);
  } catch (error) {
    await log({
      message: `Error updating default links for the partners: ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
