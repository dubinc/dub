"use server";

import { getAuthorizationUrl } from "@/lib/paypal/oauth";
import { authPartnerActionClient } from "../safe-action";

export const startPaypalOauthFlowAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    let { partner, user } = ctx;

    if (partner.paypalEmail) {
      throw new Error("You have already connected your PayPal account.");
    }

    const url = await getAuthorizationUrl({
      dubUserId: user.id,
    });

    return {
      url,
    };
  },
);
