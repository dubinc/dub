import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { chunk, constructURLFromUTMParams, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

const payloadSchema = z.object({
  groupId: z.string(),
});

// POST /api/cron/groups/sync-utm
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId } = payloadSchema.parse(JSON.parse(rawBody));

    // Find the group
    const group = await prisma.partnerGroup.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) {
      return logAndRespond(`Group ${groupId} not found. Skipping...`, {
        logLevel: "error",
      });
    }

    if (!group.utmTemplateId) {
      return logAndRespond(
        `Group ${groupId} does not have a UTM template. Skipping...`,
        { logLevel: "error" },
      );
    }

    // Find the UTM template
    const utmTemplate = await prisma.utmTemplate.findUnique({
      where: {
        id: group.utmTemplateId,
      },
    });

    if (!utmTemplate) {
      return logAndRespond(
        `UTM template ${group.utmTemplateId} not found. Skipping...`,
        {
          logLevel: "error",
        },
      );
    }

    // UTM parameters
    const utmParams = {
      utm_source: utmTemplate.utm_source,
      utm_medium: utmTemplate.utm_medium,
      utm_campaign: utmTemplate.utm_campaign,
      utm_term: utmTemplate.utm_term,
      utm_content: utmTemplate.utm_content,
      ref: utmTemplate.ref,
    } as Record<string, string>;

    let currentPage = 0;

    while (true) {
      // Find the partners in the group along with their links
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
        },
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
        include: {
          links: {
            select: {
              id: true,
              url: true,
            },
          },
        },
      });

      // If no more enrollments, break
      if (programEnrollments.length === 0) {
        break;
      }

      currentPage = currentPage + 1;

      // Array of partner links
      const links = programEnrollments.flatMap((enrollment) =>
        enrollment.links.map((link) => link),
      );

      // Split this into chunks of 100 links
      const linkChunks = chunk(links, 100);

      // Update the UTM for each partner links in the group
      for (const linkChunk of linkChunks) {
        const updatedLinks = await Promise.all(
          linkChunk.map((link) =>
            prisma.link.update({
              where: {
                id: link.id,
              },
              data: {
                url: constructURLFromUTMParams(link.url, utmParams),
                utm_source: utmTemplate.utm_source || null,
                utm_medium: utmTemplate.utm_medium || null,
                utm_campaign: utmTemplate.utm_campaign || null,
                utm_term: utmTemplate.utm_term || null,
                utm_content: utmTemplate.utm_content || null,
              },
            }),
          ),
        );

        await Promise.allSettled([
          recordLink(updatedLinks),
          linkCache.expireMany(updatedLinks),
        ]);
      }
    }

    return logAndRespond(`Synced UTM for group ${groupId}.`);
  } catch (error) {
    await log({
      message: `Error handling "groups/sync-utm" ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
