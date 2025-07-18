import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID } from "@dub/utils";

export async function getTopProgramsByCommissions({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) {
  const programCommissions = await prisma.commission.groupBy({
    by: ["programId"],
    _sum: {
      earnings: true,
    },
    where: {
      earnings: {
        gt: 0,
      },
      programId: {
        not: ACME_PROGRAM_ID,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
  });

  const topPrograms = await prisma.program.findMany({
    where: {
      id: {
        in: programCommissions.map(({ programId }) => programId),
      },
    },
  });

  const topProgramsWithCommissions = programCommissions.map(
    ({ programId, _sum }) => ({
      ...topPrograms.find((program) => program.id === programId),
      commissions: _sum.earnings || 0,
    }),
  );

  return topProgramsWithCommissions;
}
