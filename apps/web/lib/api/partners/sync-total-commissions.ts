import { publishPartnerActivityEvent } from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";

// syncs the total commissions for a partner in a program
export const syncTotalCommissions = async ({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId: string;
}) => {
  try {
    return await publishPartnerActivityEvent({
      programId,
      partnerId,
      eventType: "commission",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `[syncTotalCommissionsError]: Failed to sync total commissions for partner ${partnerId} in program ${programId}, falling back to direct database update...`,
      error,
    );

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
  }
};
