import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";
import "dotenv-flow/config";

const PAGE_SIZE = 100;

async function main() {
  const partners = await prisma.partner.findMany({
    select: {
      id: true,
      programs: {
        where: {
          programId: {
            not: ACME_PROGRAM_ID,
          },
        },
        select: {
          totalClicks: true,
          totalLeads: true,
          totalSaleAmount: true,
          totalCommissions: true,
        },
      },
    },
    where: {
      partnerRewinds: {
        none: {
          year: 2025,
        },
      },
      programs: {
        some: {
          programId: {
            not: ACME_PROGRAM_ID,
          },
          OR: [
            {
              totalClicks: {
                gt: 0,
              },
            },
            {
              totalLeads: {
                gt: 0,
              },
            },
            {
              totalSaleAmount: {
                gt: 0,
              },
            },
            {
              totalCommissions: {
                gt: 0,
              },
            },
          ],
        },
      },
    },
    take: PAGE_SIZE,
  });

  const payloads = partners.map(({ id, programs }) => ({
    partnerId: id,
    year: 2025,
    ...programs.reduce(
      (
        acc,
        { totalClicks, totalLeads, totalSaleAmount, totalCommissions },
      ) => ({
        totalClicks: acc.totalClicks + totalClicks,
        totalLeads: acc.totalLeads + totalLeads,
        totalRevenue: acc.totalRevenue + totalSaleAmount,
        totalEarnings: acc.totalEarnings + totalCommissions,
      }),
      {
        totalClicks: 0,
        totalLeads: 0,
        totalRevenue: 0,
        totalEarnings: 0,
      },
    ),
  }));

  console.table(payloads);

  await prisma.partnerRewind.createMany({
    data: payloads,
  });
}

main();
