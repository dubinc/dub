import { stripe } from "@/lib/stripe";
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

  const stripeAccountData = await stripe.accounts.retrieve(stripeAccount);
  if (stripeAccountData.deleted) {
    console.log(
      `Connected account ${stripeAccount} deauthorized, will set stripeConnectId for partner ${partner.id} to null as well`,
    );
  }

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeConnectId: stripeAccountData.deleted ? null : undefined,
      payoutsEnabledAt: null,
      payoutMethodHash: null,
    },
  });

  return `Connected account ${stripeAccount} deauthorized, updated partner ${partner.email} (${partner.id})`;
}
