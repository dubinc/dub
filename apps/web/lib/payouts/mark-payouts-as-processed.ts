import { prisma } from "@dub/prisma";
import { Payout } from "@dub/prisma/client";

export const markPayoutsAsProcessed = async (payouts: Pick<Payout, "id">[]) => {
  if (payouts.length === 0) {
    return;
  }

  await prisma.payout.updateMany({
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
};
