import { getStripeRecipientAccount } from "@/lib/stripe/get-stripe-recipient-account";
import { stripeV2ThinEventSchema } from "@/lib/stripe/stripe-v2-schemas";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import Stripe from "stripe";

export async function recipientConfigurationUpdated(event: Stripe.Event) {
  const parsedEvent = stripeV2ThinEventSchema.parse(event);

  const stripeRecipientId = parsedEvent.related_object.id;

  const partner = await prisma.partner.findUnique({
    where: {
      stripeRecipientId,
    },
    select: {
      id: true,
      stripeConnectId: true,
      paypalEmail: true,
      email: true,
      payoutsEnabledAt: true,
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

  if (isCryptoWalletActive && partner.payoutsEnabledAt) {
    return `Partner ${partner.email} (${stripeRecipientId}) already has a crypto wallet active, skipping...`;
  }

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
