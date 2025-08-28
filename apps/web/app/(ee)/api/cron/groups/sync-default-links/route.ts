import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/create-partner-link";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { WorkspaceProps } from "@/lib/types";
import { defaultPartnerLinkSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { isFulfilled, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 5;

const payloadSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
  defaultLink: defaultPartnerLinkSchema,
});

// POST /api/cron/groups/sync-default-links
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { groupId, userId, defaultLink } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    console.log(
      `Creating a default link for group ${groupId} with`,
      defaultLink,
    );

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

    // Find the workspace & program
    const { workspace, ...program } = await prisma.program.findUniqueOrThrow({
      where: {
        id: group.programId,
      },
      include: {
        workspace: true,
      },
    });

    let currentPage = 0;

    while (true) {
      // Find partners in the group
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
        },
        include: {
          partner: true,
        },
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: {
          id: "asc",
        },
      });

      if (programEnrollments.length === 0) {
        break;
      }

      currentPage = currentPage + 1;

      // Create a new defaultLink for each partner in the group
      const processedLinks = (
        await Promise.allSettled(
          programEnrollments.map(({ partner, ...programEnrollment }) =>
            generatePartnerLink({
              workspace: {
                id: workspace.id,
                plan: workspace.plan as WorkspaceProps["plan"],
                webhookEnabled: workspace.webhookEnabled,
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
                url: defaultLink.url,
                tenantId: programEnrollment.tenantId ?? undefined,
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
        `Created ${createdLinks.length} default links for the partners in the group ${groupId}.`,
      );
    }

    return logAndRespond(
      `Completed the sync of default links for group ${groupId}.`,
    );
  } catch (error) {
    await log({
      message: `Error handling "groups/sync-default-links" ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
