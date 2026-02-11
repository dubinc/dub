import { withPartnerProfile } from "@/lib/auth/partner";
import { getPartnerBankAccount } from "@/lib/partners/get-partner-bank-account";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { getStripePayoutMethods } from "@/lib/stripe/get-stripe-payout-methods";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const payoutMethodsSchema = z.object({
  type: z.enum(PartnerPayoutMethod),
  label: z.string(),
  default: z.boolean(),
  connected: z.boolean(),
  identifier: z.string().nullable(),
});

// GET /api/partner-profile/payouts/settings
export const GET = withPartnerProfile(async ({ partner }) => {
  const payoutMethods: z.infer<typeof payoutMethodsSchema>[] = [];
  const availableMethods = getPayoutMethodsForCountry(partner.country);

  // Connect
  if (availableMethods.includes(PartnerPayoutMethod.connect)) {
    let identifier: string | null = null;

    if (partner.stripeConnectId) {
      const bankAccount = await getPartnerBankAccount(partner.stripeConnectId);

      if (bankAccount) {
        identifier = bankAccount.routing_number
          ? `${bankAccount.routing_number}••••${bankAccount.last4}`
          : `••••${bankAccount.last4}`;
      }
    }

    payoutMethods.push({
      type: PartnerPayoutMethod.connect,
      label: "Bank Account",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.connect,
      connected: Boolean(partner.stripeConnectId),
      identifier,
    });
  }

  // Stablecoin
  if (availableMethods.includes(PartnerPayoutMethod.stablecoin)) {
    let identifier: string | null = null;

    if (partner.stripeRecipientId) {
      const payoutMethods = await getStripePayoutMethods(
        partner.stripeRecipientId,
      );

      const payoutMethod = payoutMethods.length > 0 ? payoutMethods[0] : null;

      if (payoutMethod?.crypto_wallet) {
        const { address } = payoutMethod.crypto_wallet;

        identifier =
          address.length > 10
            ? `${address.slice(0, 6)}••••${address.slice(-4)}`
            : address;
      }
    }

    payoutMethods.push({
      type: PartnerPayoutMethod.stablecoin,
      label: "Stablecoin",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.stablecoin,
      connected: Boolean(partner.stripeRecipientId),
      identifier,
    });
  }

  // PayPal
  if (availableMethods.includes(PartnerPayoutMethod.paypal)) {
    payoutMethods.push({
      type: PartnerPayoutMethod.paypal,
      label: "PayPal",
      default: partner.defaultPayoutMethod === PartnerPayoutMethod.paypal,
      connected: Boolean(partner.paypalEmail),
      identifier: partner.paypalEmail ?? null,
    });
  }

  return NextResponse.json(payoutMethods);
});
