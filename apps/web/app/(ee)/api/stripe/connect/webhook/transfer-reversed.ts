import { prisma } from "@dub/prisma";
import { pluralize } from "@dub/utils";
import Stripe from "stripe";

export async function transferReversed(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const stripeTransfer = event.data.object as Stripe.Transfer;

  // when transfer is reversed on Stripe, we update any sent payouts with matching stripeTransferId to:
  // - set the status to processed (so it can be resent to the partner later)
  // - reset the stripeTransferId + stripePayoutId, stripePayoutTraceId, failureReason (if any)
  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      stripeTransferId: stripeTransfer.id,
      status: "sent",
    },
    data: {
      status: "processed",
      stripeTransferId: null,
      stripePayoutId: null,
      stripePayoutTraceId: null,
      failureReason: null,
    },
  });

  return `Updated ${updatedPayouts.count} ${pluralize(
    "payout",
    updatedPayouts.count,
  )} to "processed" status for partner ${stripeAccount}.`;
}
