import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";
import { maskWalletAddress } from "@/lib/payouts/stablecoin-utils";
import { getStripeStablecoinPayoutMethod } from "@/lib/stripe/get-stripe-recipient-payout-method";
import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
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
      payoutWalletAddress: true,
    },
  });

  if (!partner) {
    return `Partner with stripeRecipientId ${stripeRecipientId} not found, skipping...`;
  }

  const { payoutsEnabledAt, defaultPayoutMethod } =
    await recomputePartnerPayoutState(partner);

  const stablecoinPayoutMethod =
    await getStripeStablecoinPayoutMethod(stripeRecipientId);

  const cryptoWalletAddress =
    stablecoinPayoutMethod?.crypto_wallet?.address ?? null;
  const cryptoWalletNetwork =
    stablecoinPayoutMethod?.crypto_wallet?.network ?? null;

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt,
      defaultPayoutMethod,
      payoutWalletAddress: cryptoWalletAddress,
    },
  });

  if (
    partner.email &&
    cryptoWalletAddress &&
    cryptoWalletAddress !== partner.payoutWalletAddress
  ) {
    await sendEmail({
      variant: "notifications",
      subject: "Successfully connected payout method",
      to: partner.email,
      react: ConnectedPayoutMethod({
        email: partner.email,
        payoutMethod: {
          type: "stablecoin",
          wallet_address: maskWalletAddress(cryptoWalletAddress),
          wallet_network: cryptoWalletNetwork,
        },
      }),
    });
  }

  if (cryptoWalletAddress) {
    detectDuplicatePayoutMethodFraud({
      payoutWalletAddress: cryptoWalletAddress,
    });
  }

  return `Updated partner ${partner.email} (${stripeRecipientId}) with payoutsEnabledAt ${payoutsEnabledAt ? "set" : "cleared"}, defaultPayoutMethod ${defaultPayoutMethod ?? "cleared"}`;
}
