import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/generate-partner-link";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
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
  defaultLinkId: z.string(),
  userId: z.string(),
  cursor: z.string().optional(),
});

/**
 * Cron job to create default partner links for all approved partners in a group.
 *
 * For each approved partner in the group, it creates a link based on
 * the group's default link configuration (domain, URL, etc.).
 *
 * It processes up to MAX_BATCH * PAGE_SIZE partners per execution
 * and schedules additional jobs if needed.
 */

// POST /api/cron/groups/create-default-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { defaultLinkId, userId, cursor } = schema.parse(JSON.parse(rawBody));

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
      `Creating default links for the partners (defaultLinkId=${defaultLink.id}, groupId=${group.id}).`,
    );

    // Find the workspace & program
    const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
      where: {
        id: group.programId,
      },
      include: {
        workspace: true,
      },
    });

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
          status: "approved",
        },
        include: {
          partner: true,
        },
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
      });

      if (programEnrollments.length === 0) {
        hasMore = false;
        break;
      }

      // Create a new defaultLink for each partner in the group
      const processedLinks = (
        await Promise.allSettled(
          programEnrollments.map(({ partner, ...programEnrollment }) =>
            generatePartnerLink({
              workspace: {
                id: workspace.id,
                plan: workspace.plan as WorkspaceProps["plan"],
              },
              program: {
                id: program.id,
                defaultFolderId: program.defaultFolderId,
              },
              partner: {
                id: partner.id,
                name: partner.name,
                email: partner.email!,
                tenantId: programEnrollment.tenantId ?? undefined,
              },
              link: {
                domain: defaultLink.domain,
                url: constructURLFromUTMParams(
                  defaultLink.url,
                  extractUtmParams(group.utmTemplate),
                ),
                ...extractUtmParams(group.utmTemplate, { excludeRef: true }),
                tenantId: programEnrollment.tenantId ?? undefined,
                partnerGroupDefaultLinkId: defaultLink.id,
              },
              userId,
            }),
          ),
        )
      )
        .filter(isFulfilled)
        .map(({ value }) => value);

      const createdLinks = await bulkCreateLinks({
        links: processedLinks,
      });

      console.log(
        `Created ${createdLinks.length} default links for the partners in the group ${group.id}.`,
      );

      // Update cursor to the last processed record
      currentCursor = programEnrollments[programEnrollments.length - 1].id;
      processedBatches++;
    }

    if (hasMore) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/create-default-links`,
        method: "POST",
        body: {
          defaultLinkId,
          userId,
          cursor: currentCursor,
        },
      });
    }

    return logAndRespond(`Finished creating default links for the partners.`);
  } catch (error) {
    await log({
      message: `Error creating default links for the partners: ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
