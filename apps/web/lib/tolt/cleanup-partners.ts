import { prisma } from "@dub/prisma";
import { toltImporter } from "./importer";

const PARTNER_IDS_PER_BATCH = 100;

// Remove partners that have no leads from the program
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
      await prisma.$transaction(async (tx) => {
        await tx.programEnrollment.deleteMany({
          where: {
            programId,
            partnerId: {
              in: partnerIdsToRemove,
            },
          },
        });

        await tx.link.deleteMany({
          where: {
            programId,
            partnerId: {
              in: partnerIdsToRemove,
            },
          },
        });

        await tx.partner.deleteMany({
          where: {
            id: {
              in: partnerIdsToRemove,
            },
          },
        });
      });
    }

    start += PARTNER_IDS_PER_BATCH;
  }

  await toltImporter.deletePartnerIds(programId);
}
