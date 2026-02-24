import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerFeatureFlags } from "@/lib/edge-config";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { getStripeStablecoinPayoutMethod } from "@/lib/stripe/get-stripe-recipient-payout-method";
import { PartnerPayoutMethodSetting } from "@/lib/types";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  const featureFlags = await getPartnerFeatureFlags(partner.id);

  const availablePayoutMethods = getPayoutMethodsForCountry({
    country: partner.country,
    stablecoinEnabled: featureFlags.stablecoin,
  });

  const [bankAccount, stripePayoutMethod] = await Promise.all([
    partner.stripeConnectId
      ? getPartnerBankAccount(partner.stripeConnectId)
      : Promise.resolve(null),

    partner.stripeRecipientId
      ? getStripeStablecoinPayoutMethod(partner.stripeRecipientId)
      : Promise.resolve(null),
  ]);

  let payoutMethods: PartnerPayoutMethodSetting[] = [];

  // Stablecoin
  if (availablePayoutMethods.includes(PartnerPayoutMethod.stablecoin)) {
    let identifier: string | null = null;

    if (stripePayoutMethod?.crypto_wallet) {
      const { address } = stripePayoutMethod.crypto_wallet;

      identifier =
        address.length > 10
          ? `${address.slice(0, 6)}••••${address.slice(-4)}`
          : address;
    }

    payoutMethods.push({
      type: PartnerPayoutMethod.stablecoin,
      label: "Stablecoin",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.stablecoin,
      connected: Boolean(stripePayoutMethod?.crypto_wallet),
      identifier,
    });
  }

  // Connect
  if (availablePayoutMethods.includes(PartnerPayoutMethod.connect)) {
    let identifier: string | null = null;

    if (bankAccount) {
      identifier = bankAccount.routing_number
        ? `${bankAccount.routing_number}••••${bankAccount.last4}`
        : `••••${bankAccount.last4}`;
    }

    payoutMethods.push({
      type: PartnerPayoutMethod.connect,
      label: "Bank Account",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.connect,
      connected: Boolean(bankAccount),
      identifier,
    });
  }

  // PayPal
  if (availablePayoutMethods.includes(PartnerPayoutMethod.paypal)) {
    payoutMethods.push({
      type: PartnerPayoutMethod.paypal,
      label: "PayPal",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.paypal,
      connected: Boolean(partner.paypalEmail),
      identifier: partner.paypalEmail ?? null,
    });
  }

  const stablecoinConnected = payoutMethods.some(
    (m) => m.type === PartnerPayoutMethod.stablecoin && m.connected,
  );

  // When Stablecoin is connected: Show only Stablecoin + any other method that is already connected
  if (stablecoinConnected) {
    payoutMethods = payoutMethods.filter(
      (m) => m.type === PartnerPayoutMethod.stablecoin || m.connected,
    );
  }

  return NextResponse.json(payoutMethods);
});
