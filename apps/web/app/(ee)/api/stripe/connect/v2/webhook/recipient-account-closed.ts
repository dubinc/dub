import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";

import { prisma } from "@dub/prisma";
import type Stripe from "stripe";

export async function recipientAccountClosed(event: Stripe.ThinEvent) {
  const { related_object: relatedObject } = event;

  if (!relatedObject) {
    return "No related object found in event, skipping...";
  }

  const { id: stripeRecipientId } = relatedObject;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeRecipientId,
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
    return `Partner with stripeRecipientId ${stripeRecipientId} not found, skipping...`;
  }

  const { payoutsEnabledAt, defaultPayoutMethod } =
    await recomputePartnerPayoutState({
      ...partner,
      stripeRecipientId: null,
    });

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeRecipientId: null,
      payoutsEnabledAt,
      defaultPayoutMethod,
    },
  });

  return `Recipient account ${stripeRecipientId} closed, removed stripeRecipientId for partner ${partner.email} (${partner.id})`;
}
