import { prisma } from "@dub/prisma";

// syncs the total commissions for a partner in a program
export const syncTotalCommissions = async ({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) => {
  return await prisma.$transaction(async (tx) => {
    const totalCommissions = await tx.commission.aggregate({
      where: {
        earnings: { not: 0 },
        programId,
        partnerId,
        status: { in: ["pending", "processed", "paid"] },
      },
      _sum: { earnings: true },
    });

    console.log(
      `Updating total commissions for partner ${partnerId} in program ${programId} to ${totalCommissions._sum.earnings || 0}`,
    );

    return await tx.programEnrollment.update({
      where: {
        partnerId_programId: { partnerId, programId },
      },
      data: {
        totalCommissions: totalCommissions._sum.earnings || 0,
      },
    });
  });
};
