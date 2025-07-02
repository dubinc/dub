import { prisma } from "@dub/prisma";
import { toltImporter } from "./importer";

const PARTNER_IDS_PER_BATCH = 100;

export async function cleanupPartners({ programId }: { programId: string }) {
  let hasMore = true;
  let start = 0;

  while (hasMore) {
    const partnerIds = await toltImporter.scanPartnerIds({
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

    const partnersWithNoLeads = links.filter((link) => link._sum.leads === 0);
    const partnerIdsToRemove = partnersWithNoLeads
      .map((link) => link.partnerId)
      .filter((partnerId) => partnerId !== null);

    if (partnerIdsToRemove.length > 0) {
      await prisma.link.deleteMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsToRemove,
          },
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

      await prisma.partner.deleteMany({
        where: {
          id: {
            in: partnerIdsToRemove,
          },
        },
      });
    }

    start += PARTNER_IDS_PER_BATCH;
  }

  await toltImporter.deletePartnerIds(programId);
}
