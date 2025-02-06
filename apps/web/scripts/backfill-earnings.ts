import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_xx";
  const partnerId = "pn_xx";
  const linkId = "link_xx";

  const clicks = await getAnalytics({
    programId,
    partnerId,
    // linkId,
    event: "clicks",
    groupBy: "timeseries",
    interval: "90d",
  });

  const commissions = clicks
    .map(({ clicks, start }) => ({
      programId,
      partnerId,
      linkId,
      type: "click",
      amount: 0,
      createdAt: new Date(start),
      updatedAt: new Date(start),
      quantity: clicks,
    }))
    .filter(({ quantity }) => quantity > 0);

  await prisma.commission.createMany({
    data: commissions,
  });

  console.log(commissions);
}

main();
