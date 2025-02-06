import { getAnalytics } from "@/lib/analytics/get-analytics";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const programId = "prog_xx";
  const partnerId = "pn_xx";

  const topLinks = await getAnalytics({
    programId,
    partnerId,
    event: "clicks",
    groupBy: "top_links",
    interval: "90d",
  });

  const commissions = topLinks.map((link) => ({
    programId,
    partnerId,
    linkId: link.id,
    type: "click",
    amount: 0,
    createdAt: link.createdAt,
    updatedAt: link.createdAt,
    quantity: link.clicks,
  }));

  await prisma.commission.createMany({
    data: commissions,
  });

  console.log(commissions);
}

main();
