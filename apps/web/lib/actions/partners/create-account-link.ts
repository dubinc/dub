"use server";

import { stripe } from "@/lib/stripe";
import { PARTNERS_DOMAIN } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const createAccountLinkAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!partner.stripeConnectId) {
      throw new Error("Partner does not have a Stripe Connect account.");
    }

    const stripeConnectVerified = false;

    const { url } = stripeConnectVerified
      ? await stripe.accounts.createLoginLink(partner.stripeConnectId)
      : await stripe.accountLinks.create({
          account: partner.stripeConnectId,
          refresh_url: `${PARTNERS_DOMAIN}/settings`,
          return_url: `${PARTNERS_DOMAIN}/settings`,
          type: "account_onboarding",
          collect: "eventually_due",
        });

    return {
      url,
    };
  },
);
