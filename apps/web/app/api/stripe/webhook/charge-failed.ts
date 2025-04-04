import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function chargeFailed(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { transfer_group: invoiceId, failure_message: failedReason } = charge;

  if (!invoiceId) {
    console.log("No transfer group found, skipping...");
    return;
  }

  // Mark the invoice as failed
  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: "failed",
      failedReason,
    },
  });

  // Mark the payouts as pending again
  await prisma.payout.updateMany({
    where: {
      invoiceId,
    },
    data: {
      status: "pending",
      userId: null,
      invoiceId: null,
    },
  });

  // TODO:
  // Send an email to the program owner about the failure
}
