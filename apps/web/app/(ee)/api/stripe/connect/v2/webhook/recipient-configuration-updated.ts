import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { recomputePartnerPayoutState } from "@/lib/payouts/recompute-partner-payout-state";
import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function recipientConfigurationUpdated(event: Stripe.ThinEvent) {
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
      cryptoWalletAddress: true,
    },
  });

  if (!partner) {
    return `Partner with stripeRecipientId ${stripeRecipientId} not found, skipping...`;
  }

  const {
    payoutsEnabledAt,
    defaultPayoutMethod,
    cryptoWalletAddress,
    cryptoWalletNetwork,
    maskedCryptoWalletAddress,
  } = await recomputePartnerPayoutState(partner);

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt,
      defaultPayoutMethod,
      cryptoWalletAddress,
    },
  });

  if (
    partner.email &&
    cryptoWalletAddress &&
    cryptoWalletAddress !== partner.cryptoWalletAddress
  ) {
    await sendEmail({
      variant: "notifications",
      subject: "Successfully connected payout method",
      to: partner.email,
      react: ConnectedPayoutMethod({
        email: partner.email,
        payoutMethod: {
          type: "stablecoin",
          wallet_address: maskedCryptoWalletAddress,
          wallet_network: cryptoWalletNetwork,
        },
      }),
    });
  }

  if (cryptoWalletAddress) {
    await detectDuplicatePayoutMethodFraud({
      cryptoWalletAddress: cryptoWalletAddress,
    });
  }

  return `Updated partner ${partner.email} (${stripeRecipientId}) with payoutsEnabledAt ${payoutsEnabledAt ? "set" : "cleared"}, defaultPayoutMethod ${defaultPayoutMethod ?? "cleared"}`;
}
