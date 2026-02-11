import { getStripeRecipientAccount } from "@/lib/stripe/get-stripe-recipient-account";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import Stripe from "stripe";

type V2ThinEvent = Stripe.Event & {
  related_object: {
    id: string;
  };
};

export async function recipientConfigurationUpdated(event: V2ThinEvent) {
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
      stripeConnectId: true,
      stripeRecipientId: true,
      paypalEmail: true,
      email: true,
      payoutsEnabledAt: true,
      payoutMethodHash: true,
    },
  });

  if (!partner) {
    return `Partner with stripeRecipientId ${stripeRecipientId} not found, skipping...`;
  }

  const stripeRecipientAccount =
    await getStripeRecipientAccount(stripeRecipientId);

  const cryptoWalletsStatus =
    stripeRecipientAccount.configuration?.recipient?.capabilities
      ?.crypto_wallets?.status;

  const isCryptoWalletActive = cryptoWalletsStatus === "active";

  const payoutsEnabledAt = isCryptoWalletActive
    ? partner.payoutsEnabledAt ?? new Date()
    : null;

  const defaultPayoutMethod = isCryptoWalletActive
    ? PartnerPayoutMethod.stablecoin
    : partner.stripeConnectId
      ? PartnerPayoutMethod.connect
      : partner.paypalEmail
        ? PartnerPayoutMethod.paypal
        : null;

  await prisma.partner.update({
    where: {
      id: partner.id,
    },
    data: {
      payoutsEnabledAt,
      defaultPayoutMethod,
    },
  });

  return `Updated partner ${partner.email} (${stripeRecipientId}) with payoutsEnabledAt ${isCryptoWalletActive ? "set" : "cleared"}, defaultPayoutMethod ${defaultPayoutMethod ?? "cleared"}`;
}
