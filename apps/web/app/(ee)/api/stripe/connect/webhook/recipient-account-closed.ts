import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import type Stripe from "stripe";

type V2ThinEvent = Stripe.Event & {
  related_object: {
    id: string;
  };
};

export async function recipientAccountClosed(event: V2ThinEvent) {
  const stripeRecipientId = event.related_object.id;

  if (!stripeRecipientId) {
    return "No stripeRecipientId found in event, skipping...";
  }

  const partner = await prisma.partner.findUnique({
    where: {
      stripeRecipientId,
    },
    select: {
      id: true,
      email: true,
      stripeConnectId: true,
      paypalEmail: true,
    },
  });

  if (!partner) {
    return `Partner with stripeRecipientId ${stripeRecipientId} not found, skipping...`;
  }

  const defaultPayoutMethod = partner.stripeConnectId
    ? PartnerPayoutMethod.connect
    : partner.paypalEmail
      ? PartnerPayoutMethod.paypal
      : null;

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      stripeRecipientId: null,
      payoutsEnabledAt: null,
      defaultPayoutMethod,
    },
  });

  return `Recipient account ${stripeRecipientId} closed, removed stripeRecipientId for partner ${partner.email} (${partner.id})`;
}
