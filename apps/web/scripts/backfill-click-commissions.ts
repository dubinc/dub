import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { getAnalytics } from "../lib/analytics/get-analytics";
import { determinePartnerReward } from "../lib/partners/determine-partner-reward";

async function main() {
  const programId = "prog_xxx";
  const partnerId = "pn_xxx";

  const reward = await determinePartnerReward({
    programId,
    partnerId,
    event: "click",
  });

  const link = await prisma.link.findFirst({
    where: {
      programId,
      partnerId,
    },
  });

  if (!reward) {
    throw new Error("Reward not found");
  }

  console.log(reward);

  const clicksData = await getAnalytics({
    programId,
    partnerId,
    event: "clicks",
    groupBy: "timeseries",
    interval: "90d",
  });

  const payoutIds = {
    "2024-11": "po_xxx",
    "2024-12": "po_xxx",
    "2025-01": "po_xxx",
  };

  const commissions = clicksData
    .map(({ clicks: quantity, start }) => {
      // skip today (2025-02-20)
      if (start.startsWith("2025-02-20")) {
        return null;
      }
      const payoutId = payoutIds[start.slice(0, 7)];
      return {
        id: createId({ prefix: "cm_" }),
        programId,
        partnerId,
        linkId: link?.id,
        payoutId,
        type: "click",
        amount: 0,
        quantity,
        earnings: reward.amount * quantity,
        status: payoutId ? "paid" : "pending",
        createdAt: new Date(start),
        updatedAt: new Date(start),
      };
    })
    .filter((c) => c && c.quantity > 0);

  console.table(commissions);

  await prisma.commission.createMany({
    data: commissions,
  });

  console.log(commissions);
}

main();
