import { detectDuplicatePayoutMethodFraud } from "@/lib/api/fraud/detect-duplicate-payout-method-fraud";
import { recomputePartnerPayoutState } from "@/lib/partners/api/recompute-partner-payout-state";
import { getStripeStablecoinPayoutMethod } from "@/lib/stripe/get-stripe-recipient-payout-method";

import { sendEmail } from "@dub/email";
import ConnectedPayoutMethod from "@dub/email/templates/connected-payout-method";
import { prisma } from "@dub/prisma";
import Stripe from "stripe";

export async function recipientConfigurationUpdated(event: Stripe.ThinEvent) {
  const { id: stripeRecipientId } = event;

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

  const maskedCryptoWalletAddress = cryptoWalletAddress
    ? cryptoWalletAddress.length > 10
      ? `${cryptoWalletAddress.slice(0, 6)}••••${cryptoWalletAddress.slice(-4)}`
      : cryptoWalletAddress
    : null;

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
          wallet_address: maskedCryptoWalletAddress,
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
