import { PartnerActivityEvent } from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// PoC script to test /api/cron/usage/update-partner-stats cron job
async function main() {
  const entries: { data: PartnerActivityEvent }[] = [
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K70XNZ8SER75KBPDRQ67VVR8",
        eventType: "lead",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K78CZY3TJ7QQKZ2NKA0FKZ00",
        eventType: "lead",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K76V6FJ24X3PHB7WK972WHKW",
        eventType: "lead",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K76V6FJ24X3PHB7WK972WHKW",
        eventType: "click",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K76V6FJ24X3PHB7WK972WHKW",
        eventType: "click",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K76V6FJ24X3PHB7WK972WHKW",
        eventType: "click",
        timestamp: "2021-01-01",
      },
    },
    {
      data: {
        programId: "prog_1K0QHV7MP3PR05CJSCF5VN93X",
        partnerId: "pn_1K76V6FJ24X3PHB7WK972WHKW",
        eventType: "commission",
        timestamp: "2021-01-01",
      },
    },
  ];

  const programEnrollmentActivity = entries.reduce(
    (acc, entry) => {
      const { programId, partnerId, eventType } = entry.data;
      const key = eventType === "commission" ? "commissionStats" : "linkStats";
      const eventTypesSet = new Set(acc[key]);
      eventTypesSet.add(`${programId}:${partnerId}`);
      acc[key] = Array.from(eventTypesSet);
      return acc;
    },
    { linkStats: [], commissionStats: [] } as Record<string, string[]>,
  );

  const programEnrollmentsToUpdate: Record<
    string,
    {
      totalClicks?: number;
      totalLeads?: number;
      totalConversions?: number;
      totalSales?: number;
      totalSaleAmount?: number;
      totalCommissions?: number;
    }
  > = {};

  if (programEnrollmentActivity.linkStats.length > 0) {
    const programIds = programEnrollmentActivity.linkStats.map(
      (p) => p.split(":")[0],
    );
    const partnerIds = programEnrollmentActivity.linkStats.map(
      (p) => p.split(":")[1],
    );
    const partnerLinkStats = await prisma.link.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId: {
          in: programIds,
        },
        partnerId: {
          in: partnerIds,
        },
      },
      _sum: {
        clicks: true,
        leads: true,
        conversions: true,
        sales: true,
        saleAmount: true,
      },
    });

    partnerLinkStats.map((p) => {
      programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`] = {
        totalClicks: p._sum.clicks ?? undefined,
        totalLeads: p._sum.leads ?? undefined,
        totalConversions: p._sum.conversions ?? undefined,
        totalSales: p._sum.sales ?? undefined,
        totalSaleAmount: p._sum.saleAmount ?? undefined,
      };
    });
  }

  if (programEnrollmentActivity.commissionStats.length > 0) {
    const programIds = programEnrollmentActivity.commissionStats.map(
      (p) => p.split(":")[0],
    );
    const partnerIds = programEnrollmentActivity.commissionStats.map(
      (p) => p.split(":")[1],
    );
    const partnerCommissionStats = await prisma.commission.groupBy({
      by: ["programId", "partnerId"],
      where: {
        earnings: { not: 0 },
        programId: {
          in: programIds,
        },
        partnerId: {
          in: partnerIds,
        },
        status: { in: ["pending", "processed", "paid"] },
      },
      _sum: {
        earnings: true,
      },
    });
    partnerCommissionStats.map((p) => {
      programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`] = {
        ...programEnrollmentsToUpdate[`${p.programId}:${p.partnerId}`], // need to keep the other stats
        totalCommissions: p._sum.earnings ?? undefined,
      };
    });
  }

  const programEnrollmentsToUpdateArray = Object.entries(
    programEnrollmentsToUpdate,
  ).map(([key, value]) => ({
    programId: key.split(":")[0],
    partnerId: key.split(":")[1],
    ...value,
  }));

  console.table(programEnrollmentsToUpdateArray);
}

main();
