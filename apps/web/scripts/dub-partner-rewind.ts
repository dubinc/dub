import { EXCLUDED_PROGRAM_IDS } from "@/lib/constants/partner-profile";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

const REWIND_EARNINGS_MINIMUM = 1_00; // $1

async function main() {
  const programEnrollments = await prisma.programEnrollment.groupBy({
    by: ["partnerId"],
    where: {
      programId: {
        notIn: EXCLUDED_PROGRAM_IDS,
      },
      totalCommissions: {
        gte: REWIND_EARNINGS_MINIMUM,
      },
    },
    _sum: {
      totalClicks: true,
      totalLeads: true,
      totalSaleAmount: true,
      totalCommissions: true,
    },
    orderBy: {
      _sum: {
        totalCommissions: "desc",
      },
    },
  });
  console.log(`Found ${programEnrollments.length} program enrollments`);

  const payloads = programEnrollments.map(({ partnerId, _sum }) => ({
    partnerId,
    year: 2025,
    totalClicks: _sum.totalClicks ?? 0,
    totalLeads: _sum.totalLeads ?? 0,
    totalRevenue: _sum.totalSaleAmount ?? 0,
    totalEarnings: _sum.totalCommissions ?? 0,
  }));

  console.table(payloads.slice(0, 10));
  console.table(payloads.slice(-10));

  const chunks = chunk(payloads, 1000);
  for (const chunk of chunks) {
    const res = await prisma.$transaction(async (tx) => {
      const deleted = await tx.partnerRewind.deleteMany({
        where: {
          partnerId: {
            in: chunk.map(({ partnerId }) => partnerId),
          },
        },
      });
      console.log(`Deleted ${deleted.count} partner rewinds`);
      return await tx.partnerRewind.createMany({
        data: chunk,
      });
    });
    console.log(`Created ${res.count} partner rewinds`);
  }
}

main();
