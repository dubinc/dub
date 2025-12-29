import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

export async function accountApplicationDeauthorized(event: Stripe.Event) {
  const stripeAccount = event.account;

  if (!stripeAccount) {
    return "No stripeConnectId found in event. Skipping...";
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: stripeAccount,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${stripeAccount} not found, skipping...`;
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeConnectId: null,
      payoutsEnabledAt: null,
      payoutMethodHash: null,
    },
  });

  return `Connected account ${stripeAccount} deauthorized, removed stripeConnectId for partner ${partner.email} (${partner.id})`;
}
