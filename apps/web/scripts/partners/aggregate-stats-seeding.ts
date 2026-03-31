import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { publishPartnerActivityEvent } from "../../lib/upstash/redis-streams";

// Seeding script to seed the partner stats with activity
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

  const BATCH = 9;
  const batchedPartnerLinksWithActivity = partnerLinksWithActivity.slice(
    BATCH * 5000,
    (BATCH + 1) * 5000,
  );
  await Promise.all(
    batchedPartnerLinksWithActivity.map(async (partnerLink) => {
      await publishPartnerActivityEvent({
        partnerId: partnerLink.partnerId!,
        programId: partnerLink.programId!,
        eventType: "click",
        timestamp: new Date().toISOString(),
      });
    }),
  );
  console.log(
    `Seeded ${batchedPartnerLinksWithActivity.length} partner links with activity`,
  );
}

main();
