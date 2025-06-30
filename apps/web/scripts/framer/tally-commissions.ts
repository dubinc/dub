import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_";

  const commissions = await prisma.commission.groupBy({
    by: ["partnerId"],
    where: {
      earnings: {
        not: 0,
      },
      programId,
      status: { in: ["pending", "processed", "paid"] },
    },
    _sum: {
      earnings: true,
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
  });

  const partners = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
  });

  const partnersMap = new Map(
    partners.map((p) => [p.partnerId, p.totalCommissions]),
  );

  const commissionsNotMatching = commissions
    .filter((c) => partnersMap.get(c.partnerId) !== c._sum.earnings)
    .map((c) => ({
      partnerId: c.partnerId,
      totalCommissions: partnersMap.get(c.partnerId),
      actualTotalCommissions: c._sum.earnings,
    }));

  console.table(commissionsNotMatching);

  await Promise.all(
    commissionsNotMatching.slice(0, 100).map((c) =>
      prisma.programEnrollment.update({
        where: { partnerId_programId: { partnerId: c.partnerId, programId } },
        data: {
          totalCommissions: c.actualTotalCommissions || 0,
        },
      }),
    ),
  );
}

main();
