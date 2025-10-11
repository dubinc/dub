import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
// import { publishPartnerActivityEvent } from "../../lib/upstash/redis-streams";

// PoC script to test /api/cron/streams/update-partner-stats cron job
async function main() {
  const partnerLinksWithActivity = await prisma.link.groupBy({
    by: ["partnerId", "programId"],
    where: {
      programId: {
        not: null,
      },
      partnerId: {
        not: null,
      },
      clicks: {
        gt: 0,
      },
    },
    _sum: {
      clicks: true,
      leads: true,
      conversions: true,
      sales: true,
      saleAmount: true,
    },
    orderBy: {
      _sum: {
        saleAmount: "desc",
      },
    },
  });

  console.log(partnerLinksWithActivity.length);
  console.table(
    partnerLinksWithActivity.slice(0, 10).map((p) => ({
      partnerId: p.partnerId,
      programId: p.programId,
      clicks: p._sum.clicks,
      leads: p._sum.leads,
      conversions: p._sum.conversions,
      sales: p._sum.sales,
      saleAmount: p._sum.saleAmount,
    })),
  );

  //   await Promise.all(
  //     partnerLinksWithActivity.map(async (partnerLink) => {
  //       const res = await publishPartnerActivityEvent({
  //         partnerId: partnerLink.partnerId!,
  //         programId: partnerLink.programId!,
  //         eventType: "click",
  //         timestamp: new Date().toISOString(),
  //       });
  //       console.log(res);
  //     }),
  //   );
}

main();
