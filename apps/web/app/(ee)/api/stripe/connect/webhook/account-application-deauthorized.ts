import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

export async function accountApplicationDeauthorized(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeConnectId: account.id,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${account.id} not found, skipping...`;
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt: null,
      payoutMethodHash: null,
    },
  });

  return `Connected account deauthorized, updated partner ${partner.email} (${partner.stripeConnectId}) with payoutsEnabledAt and payoutMethodHash null`;
}
