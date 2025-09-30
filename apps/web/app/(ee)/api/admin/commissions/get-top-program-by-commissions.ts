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
      programId: {
        not: ACME_PROGRAM_ID,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["pending", "processed", "paid"],
      },
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
    take: 50,
  });

  const topPrograms = await prisma.program.findMany({
    where: {
      id: {
        in: programCommissions.map(({ programId }) => programId),
      },
    },
    include: {
      workspace: {
        select: {
          payoutFee: true,
        },
      },
    },
  });

  const programIdMap = Object.fromEntries(
    topPrograms.map((program) => [program.id, program]),
  );

  const topProgramsWithCommissions = programCommissions
    .map(({ programId, _sum }) => {
      const program = programIdMap[programId];
      if (!program) return null;
      const commissions = _sum.earnings || 0;
      const payoutFee = program.workspace?.payoutFee || 0;
      return {
        ...program,
        commissions,
        fees: commissions * payoutFee,
      };
    })
    .filter(Boolean);

  return topProgramsWithCommissions;
}
