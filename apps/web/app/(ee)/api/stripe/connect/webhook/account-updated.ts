import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function accountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const { country, payouts_enabled } = account;

  const partner = await prisma.partner.findUnique({
    select: {
      payoutsEnabledAt: true,
    },
    where: {
      stripeConnectId: account.id,
    },
  });

  if (!partner) {
    console.error(
      `Partner not found by stripeConnectId ${account.id} in accountUpdated`,
    );
    return;
  }

  await prisma.partner.update({
    where: {
      stripeConnectId: account.id,
    },
    data: {
      country,
      payoutsEnabledAt: payouts_enabled
        ? partner.payoutsEnabledAt
          ? undefined // Don't update if already set
          : new Date()
        : null,
    },
  });
}
