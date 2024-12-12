"use server";

import { createAccountLink } from "@/lib/stripe/create-account-link";
import { authPartnerActionClient } from "../safe-action";

export const createAccountLinkAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!partner.stripeConnectId) {
      throw new Error("Partner does not have a Stripe Connect account.");
    }

    const { url } = await createAccountLink({
      stripeConnectId: partner.stripeConnectId,
    });

    return {
      url,
    };
  },
);
