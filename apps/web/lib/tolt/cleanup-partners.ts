import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import { toltImporter } from "./importer";

const PARTNER_IDS_PER_BATCH = 100;

// Remove partners with no leads and clean up orphaned partners
export async function cleanupPartners({ programId }: { programId: string }) {
  let hasMore = true;
  let start = 0;

  while (hasMore) {
    const importedPartnerIds = await toltImporter.scanPartnerIds({
      programId,
      start,
      end: start + PARTNER_IDS_PER_BATCH - 1,
    });

    if (importedPartnerIds.length === 0) {
      hasMore = false;
      break;
    }

    const links = await prisma.link.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId,
        partnerId: {
          in: importedPartnerIds,
        },
      },
      _sum: {
        leads: true,
      },
    });

    const partnersWithNoLeads = links.filter((link) => link._sum.leads === 0);
    const partnerIdsToRemove = partnersWithNoLeads
      .map((link) => link.partnerId)
      .filter((partnerId): partnerId is string => partnerId !== null);

    if (partnerIdsToRemove.length > 0) {
      const linksToDelete = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToRemove,
          },
        },
      });

      await bulkDeleteLinks(linksToDelete);

      // Resolved before the delete, since nothing can map these partners back
      // to their enrollments afterwards.
      const removedEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToRemove,
          },
        },
        select: {
          id: true,
        },
      });

      await prisma.programEnrollment.deleteMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToRemove,
          },
        },
      });

      // The enrollments were just deleted.
      await queuePartnerSearchSync({
        enrollmentIds: removedEnrollments.map(({ id }) => id),
      });

      // Remove partners that are not enrolled in any other program
      const otherProgramEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIdsToRemove,
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

      const removablePartnerIds = partnerIdsToRemove.filter(
        (partnerId) => !enrolledPartnerIds.includes(partnerId),
      );

      if (removablePartnerIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          // Find partners that have no user account
          const partnersWithoutUserAccount = await tx.partner.findMany({
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
            await tx.partner.deleteMany({
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
        });
      }
    }

    start += PARTNER_IDS_PER_BATCH;
  }

  await toltImporter.deletePartnerIds(programId);
}
