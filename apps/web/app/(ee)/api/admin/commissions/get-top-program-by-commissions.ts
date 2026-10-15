import { prisma } from "@/lib/prisma";

export async function getTopProgramsByCommissions({
  programId,
  partnerId,
  startDate,
  endDate,
}: {
  programId?: string;
  partnerId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const programCommissions = await prisma.commission.groupBy({
    by: ["programId"],
    _sum: {
      earnings: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["pending", "processed", "paid"],
      },
      program: {
        environment: "production",
      },
      ...(programId ? { programId } : {}),
      ...(partnerId ? { partnerId } : {}),
    },
    orderBy: {
      _sum: {
        earnings: "desc",
      },
    },
    take: 150,
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
    .filter(Boolean)
    .slice(0, 100);

  return topProgramsWithCommissions;
}
