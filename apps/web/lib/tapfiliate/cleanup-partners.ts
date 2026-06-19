import { prisma } from "@/lib/prisma";
import { tapfiliateImporter } from "./importer";

const PARTNER_IDS_PER_BATCH = 100;

// Remove partners with no leads and clean up orphaned partners
export async function cleanupPartners({ programId }: { programId: string }) {
  let hasMore = true;
  let start = 0;

  while (hasMore) {
    const partnerIds = await tapfiliateImporter.listImportedPartnerIds({
      programId,
      start,
      end: start + PARTNER_IDS_PER_BATCH - 1,
    });

    if (partnerIds.length === 0) {
      hasMore = false;
      break;
    }

    const links = await prisma.link.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId,
        partnerId: {
          in: partnerIds,
        },
      },
      _sum: {
        leads: true,
      },
    });

    const linksWithNoLeads = links.filter((link) => link._sum.leads === 0);

    const partnerIdsWithNoLeads = linksWithNoLeads
      .map((link) => link.partnerId)
      .filter((partnerId): partnerId is string => partnerId !== null);

    if (partnerIdsWithNoLeads.length > 0) {
      // Remove program enrollments and links for partners with no leads
      await prisma.$transaction(async (tx) => {
        await tx.programEnrollment.deleteMany({
          where: {
            programId,
            partnerId: {
              in: partnerIdsWithNoLeads,
            },
          },
        });

        await tx.link.deleteMany({
          where: {
            programId,
            partnerId: {
              in: partnerIdsWithNoLeads,
            },
          },
        });
      });

      // Remove partners that are not enrolled in any other program
      const otherProgramEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIdsWithNoLeads,
          },
          programId: {
            not: programId,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const enrolledPartnerIds = otherProgramEnrollments.map(
        ({ partnerId }) => partnerId,
      );

      // Find partners that are not enrolled in any other program
      const removablePartnerIds = partnerIdsWithNoLeads.filter(
        (partnerId) => !enrolledPartnerIds.includes(partnerId),
      );

      // Find partners that have no user account
      const partnersWithoutUserAccount = await prisma.partner.findMany({
        where: {
          id: {
            in: removablePartnerIds,
          },
          users: {
            none: {},
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (partnersWithoutUserAccount.length > 0) {
        await prisma.partner.deleteMany({
          where: {
            id: {
              in: partnersWithoutUserAccount.map(({ id }) => id),
            },
          },
        });

        console.log(
          "Removed the following partners",
          partnersWithoutUserAccount,
        );
      }
    }

    start += PARTNER_IDS_PER_BATCH;
  }

  await tapfiliateImporter.clearImportedPartnerIds(programId);
}
