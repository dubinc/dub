import { publishPartnerActivityEvent } from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";

// syncs the total links stats for a partner in a program
export const syncPartnerLinksStats = async ({
  partnerId,
  programId,
  eventType,
}: {
  partnerId: string;
  programId: string;
  eventType: "click" | "lead" | "sale";
}) => {
  try {
    return await publishPartnerActivityEvent({
      programId,
      partnerId,
      eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `[syncPartnerLinksStatsError]: Failed to sync ${eventType} stats for partner ${partnerId} in program ${programId}, falling back to direct database update...`,
      error,
    );

    return await prisma.$transaction(async (tx) => {
      const res = await tx.link.aggregate({
        where: {
          programId,
          partnerId,
        },
        _sum: {
          clicks: true,
          leads: true,
          conversions: true,
          sales: true,
          saleAmount: true,
        },
      });

      const partnerLinkStats = {
        totalClicks: res._sum.clicks ?? undefined,
        totalLeads: res._sum.leads ?? undefined,
        totalConversions: res._sum.conversions ?? undefined,
        totalSales: res._sum.sales ?? undefined,
        totalSaleAmount: res._sum.saleAmount ?? undefined,
      };

      console.log(
        `Updating link stats for partner ${partnerId} in program ${programId} to ${JSON.stringify(partnerLinkStats)}`,
      );

      return await tx.programEnrollment.update({
        where: {
          partnerId_programId: { partnerId, programId },
        },
        data: partnerLinkStats,
      });
    });
  }
};
