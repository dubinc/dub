import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import type Stripe from "stripe";

export async function recipientAccountClosed(event: Stripe.Event) {
  const parsedEvent = stripeV2ThinEventSchema.parse(event);

  const stripeRecipientId = parsedEvent.related_object.id;

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
