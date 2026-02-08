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
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const schema = z.object({
  groupId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  startAfterProgramEnrollmentId: z.string().optional(),
});

/**
    Syncs the UTM parameter settings for a given group (whether there is a UTM template or not)

    This job is triggered when:
    1. a UTM template is created for a group
    2. a UTM template is updated
    3. in groups/remap-default-links cron
 */

// POST /api/cron/groups/sync-utm
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId, partnerIds, startAfterProgramEnrollmentId } = schema.parse(
      JSON.parse(rawBody),
    );

    // Find the UTM template
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
      include: {
        utmTemplate: true,
      },
    });

    if (!group) {
      return logAndRespond(
        `Group ${groupId} not found for groups/sync-utm cron. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    const { utmTemplate } = group;

    // Find partners in the group
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
        ...(partnerIds && {
          partnerId: {
            in: partnerIds,
          },
        }),
        ...(startAfterProgramEnrollmentId && {
          id: {
            gt: startAfterProgramEnrollmentId,
          },
        }),
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
      return logAndRespond(`No program enrollments found. Skipping...`);
    }

    // extract links from program enrollments
    const linksToUpdate = programEnrollments.flatMap((enrollment) =>
      enrollment.links.map((link) => link),
    );
    // group links by the same url
    const groupedLinksToUpdate = linksToUpdate.reduce(
      (acc, link) => {
        acc[link.url] = acc[link.url] || [];
        acc[link.url].push(link.id);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Update the UTM for each partner links in the group
    for (const [url, linkIds] of Object.entries(groupedLinksToUpdate)) {
      const payload = {
        url: constructURLFromUTMParams(url, extractUtmParams(utmTemplate)),
        ...extractUtmParams(utmTemplate, { excludeRef: true }),
      };

      const updatedLinks = await prisma.link.updateMany({
        where: {
          id: {
            in: linkIds,
          },
        },
        data: payload,
      });
      console.log(
        `Updated ${updatedLinks.count} links with URL: ${payload.url}`,
      );
    }

    const redisRes = await linkCache.expireMany(linksToUpdate);
    console.log(`Updated Redis cache: ${JSON.stringify(redisRes, null, 2)}`);

    if (programEnrollments.length === PAGE_SIZE) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/sync-utm`,
        method: "POST",
        body: {
          groupId,
          partnerIds,
          startAfterProgramEnrollmentId:
            programEnrollments[programEnrollments.length - 1].id,
        },
      });
    }

    return logAndRespond(
      `Finished syncing UTM settings for ${programEnrollments.length} partners in the ${group.name} group (${group.id}).`,
    );
  } catch (error) {
    await log({
      message: `Error syncing UTM settings: ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
