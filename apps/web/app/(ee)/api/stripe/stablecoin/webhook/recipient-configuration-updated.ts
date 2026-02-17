import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";
import { getStripeStablecoinPayoutMethod } from "@/lib/stripe/get-stripe-recipient-payout-method";
import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import { hashStringSHA256 } from "@dub/utils";
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

  const stablecoinPayoutMethod =
    await getStripeStablecoinPayoutMethod(stripeRecipientId);

  const payoutWalletAddress = stablecoinPayoutMethod?.crypto_wallet?.address
    ? await hashStringSHA256(stablecoinPayoutMethod?.crypto_wallet?.address)
    : null;

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt,
      defaultPayoutMethod,
      payoutWalletAddress,
    },
  });

  if (payoutWalletAddress) {
    detectDuplicatePayoutMethodFraud({
      payoutWalletAddress,
    });
  }

  return `Updated partner ${partner.email} (${stripeRecipientId}) with payoutsEnabledAt ${payoutsEnabledAt ? "set" : "cleared"}, defaultPayoutMethod ${defaultPayoutMethod ?? "cleared"}`;
}
