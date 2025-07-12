import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function payoutPaid(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    console.error(
      `Stripe connect account ${stripeAccount} not found. Skipping...`,
    );
    return;
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: stripeAccount,
    },
  });

  if (!partner) {
    console.error(
      `Partner not found with Stripe connect account ${stripeAccount}. Skipping...`,
    );
    return;
  }

  const stripePayout = event.data.object as Stripe.Payout;

  const updatedPayouts = await prisma.payout.updateMany({
    where: {
      status: "sent",
      stripePayoutId: stripePayout.id,
    },
    data: {
      status: "completed",
    },
  });

  console.log(
    `Updated ${updatedPayouts.count} payouts for partner ${partner.email} (${stripeAccount}) to "completed" status`,
  );
}
