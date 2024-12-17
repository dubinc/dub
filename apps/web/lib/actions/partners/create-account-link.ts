"use server";

import { stripe } from "@/lib/stripe";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const createAccountLinkAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    let { partner } = ctx;

    if (!partner.stripeConnectId) {
      // TODO: Stripe Connect – remove this once we can onboard partners from other countries
      if (partner.country !== "US") {
        throw new Error(
          "We currently only support US partners, but we will be adding more countries very soon.",
        );
      }
      throw new Error("Partner does not have a Stripe Connect account.");
    }

    const { url } = partner.payoutsEnabled
      ? await stripe.accounts.createLoginLink(partner.stripeConnectId)
      : await stripe.accountLinks.create({
          account: partner.stripeConnectId,
          refresh_url: `${PARTNERS_DOMAIN}/settings/payouts`,
          return_url: `${PARTNERS_DOMAIN}/settings/payouts`,
          type: "account_onboarding",
          collect: "eventually_due",
        });

    return {
      url,
    };
  },
);
