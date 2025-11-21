import { prisma } from "@dub/prisma";
import { PAYPAL_SUPPORTED_COUNTRIES } from "@dub/utils";

export async function getPendingPaypalPayouts() {
  const payouts = await prisma.payout.findMany({
    where: {
      status: {
        in: ["pending", "processing"],
      },
      partner: {
        paypalEmail: {
          not: null,
        },
        payoutsEnabledAt: {
          not: null,
        },
        country: {
          in: PAYPAL_SUPPORTED_COUNTRIES,
        },
      },
    },
    include: {
      partner: true,
      program: true,
    },
  });

  const eligiblePayouts = payouts.filter(
    (payout) => payout.amount >= payout.program.minPayoutAmount,
  );

  return eligiblePayouts;
}
