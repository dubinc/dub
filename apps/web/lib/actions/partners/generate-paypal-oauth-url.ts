"use server";

import { paypalOAuth } from "@/lib/paypal/oauth";
import { COUNTRIES, PAYPAL_SUPPORTED_COUNTRIES } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const generatePaypalOAuthUrl = authPartnerActionClient.action(
  async ({ ctx }) => {
    let { partner, user } = ctx;

    if (!partner.country) {
      throw new Error(
        "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
      );
    }

    if (!PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)) {
      throw new Error(
        `Your current country (${COUNTRIES[partner.country]}) is not supported for PayPal payouts. Please go to partners.dub.co/settings to update your country, or contact support.`,
      );
    }

    const url = await paypalOAuth.getAuthorizationUrl({
      dubUserId: user.id,
    });

    return {
      url,
    };
  },
);
