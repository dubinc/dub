import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { prisma } from "@dub/prisma";
import { Payload } from "./utils";

export async function sendPaypalPayouts({ payload }: { payload: Payload }) {
  const { invoiceId } = payload;

  const payouts = await prisma.payout.findMany({
    where: {
      invoiceId,
      status: {
        not: "completed",
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
        paypalEmail: {
          not: null,
        },
      },
    },
    include: {
      partner: true,
      program: true,
    },
  });

  if (payouts.length === 0) {
    console.log("No payouts for sending via PayPal, skipping...");
    return;
  }

  await createPayPalBatchPayout({
    payouts,
    invoiceId,
  });
}
