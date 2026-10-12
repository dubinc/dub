import { prisma } from "@/lib/prisma";
import { NETWORK_PROGRAM_ID } from "@dub/utils";
import { PayoutStatus } from "@prisma/client";

export async function throwIfNegativeNetworkBalance(partnerId: string) {
  // edge case: cannot switch to PayPal if partner has negative network balance
  const negativeNetworkPayoutsCount = await prisma.payout.count({
    where: {
      partnerId,
      programId: NETWORK_PROGRAM_ID,
      status: PayoutStatus.processed, // if sent/completed, means that the negative balance was fulfilled
      amount: {
        lt: 0,
      },
    },
  });

  if (negativeNetworkPayoutsCount > 0) {
    throw new Error(
      "You cannot perform this action since you have a negative network balance.",
    );
  }
}
