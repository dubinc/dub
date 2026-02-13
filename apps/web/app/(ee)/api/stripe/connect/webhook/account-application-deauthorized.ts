import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";
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
    select: {
      id: true,
      email: true,
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      payoutsEnabledAt: true,
      defaultPayoutMethod: true,
    },
  });

  if (!partner) {
    return `Partner with stripeConnectId ${stripeAccount} not found, skipping...`;
  }

  const { payoutsEnabledAt, defaultPayoutMethod } =
    await recomputePartnerPayoutState({
      ...partner,
      stripeConnectId: null,
    });

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeConnectId: null,
      payoutsEnabledAt,
      defaultPayoutMethod,
    },
  });

  return `Connected account ${stripeAccount} deauthorized, removed stripeConnectId for partner ${partner.email} (${partner.id})`;
}
