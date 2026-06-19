import { stripe } from "@/lib/stripe";
import { getStripeRecipientAccount } from "@/lib/stripe/get-stripe-recipient-account";
import { prettyPrint } from "@dub/utils";
import { Partner, PartnerPayoutMethod } from "@prisma/client";
import { getStripeRecipientPayoutMethod } from "../stripe/get-stripe-recipient-payout-method";

const PAYOUT_METHOD_PRIORITY: PartnerPayoutMethod[] = [
  PartnerPayoutMethod.stablecoin,
  PartnerPayoutMethod.connect,
  PartnerPayoutMethod.paypal,
  PartnerPayoutMethod.tremendous,
];

/**
 * Computes payoutsEnabledAt and defaultPayoutMethod based on currently active
 * payout methods. Preserves the partner's existing default when it is still
 * active; otherwise falls back to priority order: stablecoin > connect > paypal.
 */
export async function recomputePartnerPayoutState(
  partner: Pick<
    Partner,
    | "stripeConnectId"
    | "stripeRecipientId"
    | "paypalEmail"
    | "payoutsEnabledAt"
    | "defaultPayoutMethod"
    | "tremendousEmail"
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

  const hasCryptoWalletCapabilities = Boolean(
    stablecoinAccount?.configuration?.recipient?.capabilities?.crypto_wallets
      ?.status === "active",
  );

  const stablecoinPayoutMethod =
    partner.stripeRecipientId && hasCryptoWalletCapabilities
      ? await getStripeRecipientPayoutMethod(partner.stripeRecipientId)
      : null;

  const cryptoWalletAddress =
    stablecoinPayoutMethod?.crypto_wallet?.address ?? null;
  const cryptoWalletNetwork =
    stablecoinPayoutMethod?.crypto_wallet?.network ?? null;

  const connectActive = Boolean(
    connectAccount?.payouts_enabled === true &&
      connectAccount?.capabilities?.transfers === "active",
  );

  const stablecoinActive = Boolean(
    hasCryptoWalletCapabilities && cryptoWalletAddress && cryptoWalletNetwork,
  );

  const paypalActive = Boolean(partner.paypalEmail);

  const tremendousActive = Boolean(partner.tremendousEmail);

  const activePayoutMethods = PAYOUT_METHOD_PRIORITY.filter((method) => {
    switch (method) {
      case PartnerPayoutMethod.stablecoin:
        return stablecoinActive;
      case PartnerPayoutMethod.connect:
        return connectActive;
      case PartnerPayoutMethod.paypal:
        return paypalActive;
      case PartnerPayoutMethod.tremendous:
        return tremendousActive;
      default:
        return false;
    }
  });

  const hasValidDefaultPayoutMethod =
    partner.defaultPayoutMethod &&
    activePayoutMethods.includes(partner.defaultPayoutMethod);

  const defaultPayoutMethod = hasValidDefaultPayoutMethod
    ? partner.defaultPayoutMethod
    : activePayoutMethods[0] ?? null;

  let payoutsEnabledAt: Date | null = null;

  if (defaultPayoutMethod) {
    // if default payout method has changed, set payoutsEnabledAt to today
    // otherwise, use the existing payoutsEnabledAt (or today if null)
    if (defaultPayoutMethod !== partner.defaultPayoutMethod) {
      payoutsEnabledAt = new Date();
    } else if (partner.payoutsEnabledAt) {
      payoutsEnabledAt = partner.payoutsEnabledAt;
    } else {
      payoutsEnabledAt = new Date();
    }
  }

  console.log(
    "[recomputePartnerPayoutState]",
    prettyPrint({
      connectActive,
      stablecoinActive,
      paypalActive,
      tremendousActive,
      payoutsEnabledAt,
      defaultPayoutMethod,
    }),
  );

  const maskedCryptoWalletAddress = cryptoWalletAddress
    ? cryptoWalletAddress.length > 10
      ? `${cryptoWalletAddress.slice(0, 6)}••••${cryptoWalletAddress.slice(-4)}`
      : cryptoWalletAddress
    : null;

  const hasPayoutStateChanged =
    partner.payoutsEnabledAt !== payoutsEnabledAt ||
    partner.defaultPayoutMethod !== defaultPayoutMethod;

  return {
    payoutsEnabledAt,
    defaultPayoutMethod,
    activePayoutMethods,
    cryptoWalletAddress,
    cryptoWalletNetwork,
    maskedCryptoWalletAddress,
    hasPayoutStateChanged,
  };
}
