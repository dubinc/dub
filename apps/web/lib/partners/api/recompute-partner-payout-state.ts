import { stripe } from "@/lib/stripe";
import { getStripeRecipientAccount } from "@/lib/stripe/get-stripe-recipient-account";
import { Partner, PartnerPayoutMethod } from "@dub/prisma/client";
import { prettyPrint } from "@dub/utils";

const PAYOUT_METHOD_PRIORITY: PartnerPayoutMethod[] = [
  PartnerPayoutMethod.stablecoin,
  PartnerPayoutMethod.connect,
  PartnerPayoutMethod.paypal,
];

/**
 * Computes payoutsEnabledAt and defaultPayoutMethod after a payout method is
 * disconnected. Fetches Stripe account status to determine availability;
 * preserves payouts when another method remains active; clears both when no
 * methods remain.
 */
export async function recomputePartnerPayoutState(
  partner: Pick<
    Partner,
    | "stripeConnectId"
    | "stripeRecipientId"
    | "paypalEmail"
    | "payoutsEnabledAt"
    | "defaultPayoutMethod"
  >,
) {
  const [connectAccount, stablecoinAccount] = await Promise.all([
    partner.stripeConnectId
      ? stripe.accounts.retrieve(partner.stripeConnectId)
      : Promise.resolve(null),

    partner.stripeRecipientId
      ? getStripeRecipientAccount(partner.stripeRecipientId)
      : Promise.resolve(null),
  ]);

  const connectActive = Boolean(
    connectAccount?.payouts_enabled === true &&
      connectAccount?.capabilities?.transfers === "active",
  );

  const stablecoinActive = Boolean(
    stablecoinAccount?.configuration?.recipient?.capabilities?.crypto_wallets
      ?.status === "active",
  );

  const paypalActive = Boolean(partner.paypalEmail);

  const activePayoutMethods = PAYOUT_METHOD_PRIORITY.filter((method) => {
    switch (method) {
      case PartnerPayoutMethod.stablecoin:
        return stablecoinActive;
      case PartnerPayoutMethod.connect:
        return connectActive;
      case PartnerPayoutMethod.paypal:
        return paypalActive;
      default:
        return false;
    }
  });

  // Preserve existing default if still active; otherwise pick first by priority
  let defaultPayoutMethod: PartnerPayoutMethod | null = null;

  if (activePayoutMethods.length > 0) {
    if (
      partner.defaultPayoutMethod &&
      activePayoutMethods.includes(partner.defaultPayoutMethod)
    ) {
      defaultPayoutMethod = partner.defaultPayoutMethod;
    } else {
      defaultPayoutMethod = activePayoutMethods[0];
    }
  }

  let payoutsEnabledAt: Date | null = null;

  if (defaultPayoutMethod) {
    payoutsEnabledAt = partner.payoutsEnabledAt ?? new Date();
  } else {
    payoutsEnabledAt = null;
  }

  console.log(
    "[recomputePartnerPayoutState]",
    prettyPrint({
      connectActive,
      stablecoinActive,
      paypalActive,
      payoutsEnabledAt,
      defaultPayoutMethod,
    }),
  );

  return {
    payoutsEnabledAt,
    defaultPayoutMethod,
  };
}
