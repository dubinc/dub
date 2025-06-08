import { prisma } from "@dub/prisma";

// syncs the total commissions for a partner in a program
export const syncTotalCommissions = async ({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) => {
  const totalCommissions = await prisma.commission.aggregate({
    where: {
      earnings: {
        gt: 0,
      },
      programId,
      partnerId,
    },
    _sum: { earnings: true },
  });

  return await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    data: {
      totalCommissions: totalCommissions._sum.earnings || 0,
    },
  });
};
