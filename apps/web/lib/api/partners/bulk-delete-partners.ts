import { prisma } from "@dub/prisma";
import { bulkDeleteLinks } from "../links/bulk-delete-links";

// bulk delete multiple partners and all associated links, customers, payouts, and commissions
// currently only used for the cron/cleanup job
export async function bulkDeletePartners({
  partnerIds,
}: {
  partnerIds: string[];
}) {
  const partners = await prisma.partner.findMany({
    where: {
      id: {
        in: partnerIds,
      },
    },
    include: {
      programs: {
        select: {
          links: true,
        },
      },
    },
  });

  const finalParterIds = partners.map((partner) => partner.id);

  const linksToDelete = partners.flatMap((partner) =>
    partner.programs.length > 0 ? partner.programs[0].links : [],
  );

  if (linksToDelete.length > 0) {
    await prisma.customer.deleteMany({
      where: {
        linkId: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    });

    await bulkDeleteLinks(linksToDelete);

    await prisma.link.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    });
  }

  await prisma.commission.deleteMany({
    where: {
      partnerId: {
        in: finalParterIds,
      },
    },
  });

  await prisma.payout.deleteMany({
    where: {
      partnerId: {
        in: finalParterIds,
      },
    },
  });

  await prisma.partner.deleteMany({
    where: {
      id: {
        in: finalParterIds,
      },
    },
  });
}
