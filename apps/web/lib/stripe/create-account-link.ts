import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { stripe } from ".";

// TODO:
// refresh_url can also be a api path that generate new account link and redirect to it

export const createAccountLink = async ({
  stripeConnectId,
}: {
  stripeConnectId: string;
}) => {
  try {
    return await stripe.accountLinks.create({
      account: stripeConnectId,
      refresh_url: `${APP_DOMAIN_WITH_NGROK}/settings/payouts`,
      return_url: `${APP_DOMAIN_WITH_NGROK}/settings/payouts`,
      type: "account_onboarding",
      collect: "eventually_due",
    });
  } catch (error) {
    throw new Error(
      `[Stripe Connect] Failed to create account link: ${error.message}.`,
    );
  }
};
