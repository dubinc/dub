import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";
import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function recipientConfigurationUpdated(event: Stripe.Event) {
  const {
    related_object: { id: stripeRecipientId },
  } = stripeV2ThinEventSchema.parse(event);

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
    await recomputePartnerPayoutState(partner);

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt,
      defaultPayoutMethod,
    },
  });

  return `Updated partner ${partner.email} (${stripeRecipientId}) with payoutsEnabledAt ${payoutsEnabledAt ? "set" : "cleared"}, defaultPayoutMethod ${defaultPayoutMethod ?? "cleared"}`;
}
