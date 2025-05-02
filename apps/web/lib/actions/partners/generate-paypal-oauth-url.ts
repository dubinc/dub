"use server";

import { paypalEnv } from "@/lib/paypal/env";
import { paypalOAuth } from "@/lib/paypal/oauth";
import { authPartnerActionClient } from "../safe-action";

export const generatePaypalOAuthUrl = authPartnerActionClient.action(
  async ({ ctx }) => {
    let { partner, user } = ctx;

    if (partner.paypalEmail) {
      return {
        url: `${paypalEnv.PAYPAL_AUTHORIZE_HOST}/myaccount/summary`,
      };
    }

    if (!partner.country) {
      throw new Error(
        "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
      );
    }

    if (partner.country === "US") {
      throw new Error(
        "PayPal payouts is not supported in the United States. Please go to partners.dub.co/settings to update your country, or contact support.",
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
