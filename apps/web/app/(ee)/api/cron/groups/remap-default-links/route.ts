import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/generate-partner-link";
import { qstash } from "@/lib/cron";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { WorkspaceProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, isFulfilled, log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";
import { remapPartnerGroupDefaultLinks } from "./utils";
export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  groupId: z.string(),
  partnerIds: z.array(z.string()).min(1),
  userId: z.string(),
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

    const { programId, groupId, partnerIds, userId } = schema.parse(
      JSON.parse(rawBody),
    );

    const [program, partnerGroup, programEnrollments] = await Promise.all([
      prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
        include: {
          workspace: true,
        },
      }),
      prisma.partnerGroup.findUniqueOrThrow({
        where: {
          id: groupId,
        },
        include: {
          utmTemplate: true,
          partnerGroupDefaultLinks: true,
        },
      }),
      prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIds,
          },
          programId,
        },
        include: {
          partner: true,
          partnerGroup: true,
          links: {
            where: {
              partnerGroupDefaultLinkId: {
                not: null,
              },
            },
          },
        },
      }),
    ]);

    console.log(
      `Updating ${programEnrollments.length} partners to be moved to group ${partnerGroup.name} (${partnerGroup.id}) for program ${program.name} (${program.id}).`,
    );

    const remappedLinks = programEnrollments.map(
      ({ partnerId, links: partnerLinks }) =>
        remapPartnerGroupDefaultLinks({
          partnerId,
          partnerLinks,
          newGroupDefaultLinks: partnerGroup.partnerGroupDefaultLinks,
        }),
    );

    const linksToCreate = remappedLinks.flatMap(
      ({ linksToCreate }) => linksToCreate,
    );

    const linksToUpdate = remappedLinks.flatMap(
      ({ linksToUpdate }) => linksToUpdate,
    );

    const linksToRemoveMapping = remappedLinks.flatMap(
      ({ linksToRemoveMapping }) => linksToRemoveMapping,
    );

    console.log("linksToUpdate", linksToUpdate);
    console.log("linksToCreate", linksToCreate);
    console.log("linksToRemoveMapping", linksToRemoveMapping);

    // Create the links
    if (linksToCreate.length > 0) {
      const processedLinks = (
        await Promise.allSettled(
          linksToCreate.map((link) => {
            const programEnrollment = programEnrollments.find(
              (p) => p.partner.id === link.partnerId,
            );

            const partner = programEnrollment?.partner;

            return generatePartnerLink({
              workspace: {
                id: program.workspace.id,
                plan: program.workspace.plan as WorkspaceProps["plan"],
              },
              program: {
                id: program.id,
                defaultFolderId: program.defaultFolderId,
              },
              partner: {
                id: partner?.id,
                name: partner?.name,
                email: partner?.email!,
                tenantId: programEnrollment?.tenantId ?? undefined,
              },
              link: {
                domain: link.domain,
                url: link.url,
                tenantId: programEnrollment?.tenantId ?? undefined,
                partnerGroupDefaultLinkId: link.partnerGroupDefaultLinkId,
              },
              userId,
            });
          }),
        )
      )
        .filter(isFulfilled)
        .map(({ value }) => value);

      const createdLinks = await bulkCreateLinks({
        links: processedLinks,
      });

      console.log(`Created ${createdLinks.length} links.`);
    }

    // Update the links
    if (linksToUpdate.length > 0) {
      const groupedLinksToUpdate = linksToUpdate.reduce(
        (acc, link) => {
          acc[link.partnerGroupDefaultLinkId] =
            acc[link.partnerGroupDefaultLinkId] || [];
          acc[link.partnerGroupDefaultLinkId].push(link.id);
          return acc;
        },
        {} as Record<string, string[]>,
      );

      for (const [partnerGroupDefaultLinkId, linkIds] of Object.entries(
        groupedLinksToUpdate,
      )) {
        const updatedLinks = await prisma.link.updateMany({
          where: {
            id: {
              in: linkIds,
            },
          },
          data: {
            partnerGroupDefaultLinkId: partnerGroupDefaultLinkId,
          },
        });
        console.log(
          `Updated ${updatedLinks.count} links with partnerGroupDefaultLinkId: ${partnerGroupDefaultLinkId}`,
        );
      }
    }

    if (linksToRemoveMapping.length > 0) {
      const updatedLinks = await prisma.link.updateMany({
        where: {
          id: {
            in: linksToRemoveMapping,
          },
        },
        data: {
          partnerGroupDefaultLinkId: null,
        },
      });
      console.log(
        `Updated ${updatedLinks.count} links with partnerGroupDefaultLinkId: null`,
      );
    }

    if (partnerGroup.utmTemplateId) {
      const res = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/sync-utm`,
        body: {
          utmTemplateId: partnerGroup.utmTemplateId,
        },
      });
      console.log(
        `Scheduled sync-utm job for template ${partnerGroup.utmTemplateId}: ${JSON.stringify(res, null, 2)}`,
      );
    }

    return logAndRespond(`Finished creating default links for the partners.`);
  } catch (error) {
    await log({
      message: `Error creating default links for the partners: ${error.message}.`,
      type: "errors",
    });

    console.error(error);

    return handleAndReturnErrorResponse(error);
  }
}
