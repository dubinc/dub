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

  const { count: payoutsCount } = await prisma.payout.updateMany({
    where: {
      status: "sent",
      stripePayoutId: stripePayout.id,
    },
    data: {
      status: "completed",
    },
  });

  if (payoutsCount === 0) {
    console.error(
      `No payouts found with Stripe payout ID ${stripePayout.id}. Skipping...`,
    );
    return;
  }

  const payouts = await prisma.payout.findMany({
    where: {
      stripePayoutId: stripePayout.id,
    },
    select: {
      id: true,
    },
  });

  console.log(
    `Completed payouts for Stripe Connect account ${stripeAccount}: [${payouts.map((p) => p.id).join(", ")}]`,
  );
}
