import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
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

const PAGE_SIZE = 50;

const schema = z.object({
  utmTemplateId: z.string(),
  partnerIds: z.array(z.string()).optional(),
  startAfterProgramEnrollmentId: z.string().optional(),
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

    const { utmTemplateId, partnerIds, startAfterProgramEnrollmentId } =
      schema.parse(JSON.parse(rawBody));

    // Find the UTM template
    const utmTemplate = await prisma.utmTemplate.findUnique({
      where: {
        id: utmTemplateId,
      },
      include: {
        partnerGroup: {
          include: {
            partnerGroupDefaultLinks: true,
          },
        },
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

    const utmParams = {
      utm_source: utmTemplate.utm_source || null,
      utm_medium: utmTemplate.utm_medium || null,
      utm_campaign: utmTemplate.utm_campaign || null,
      utm_term: utmTemplate.utm_term || null,
      utm_content: utmTemplate.utm_content || null,
    };

    // Update the UTM for each partner links in the group
    for (const [url, linkIds] of Object.entries(groupedLinksToUpdate)) {
      const payload = {
        url: constructURLFromUTMParams(url, {
          ...utmParams,
          ref: utmTemplate.ref || null,
        }),
        ...utmParams,
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
          utmTemplateId,
          startAfterProgramEnrollmentId:
            programEnrollments[programEnrollments.length - 1].id,
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
