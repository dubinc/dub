import { prisma } from "@/lib/prisma";
import { Payout } from "@prisma/client";

export const markPayoutsAsProcessed = async (payouts: Pick<Payout, "id">[]) => {
  if (payouts.length === 0) {
    return;
  }

  const { count } = await prisma.payout.updateMany({
    where: {
      id: {
        in: payouts.map((p) => p.id),
      },
    },
    data: {
      status: "processed",
      paidAt: new Date(),
    },
  });

  console.log(`Marked ${count} payouts as processed`);
};
