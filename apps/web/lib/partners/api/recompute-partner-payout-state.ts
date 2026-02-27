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
 * Computes payoutsEnabledAt and defaultPayoutMethod based on currently active
 * payout methods. The default is always selected from priority order:
 * stablecoin > connect > paypal.
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

  const defaultPayoutMethod = activePayoutMethods[0] ?? null;
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
