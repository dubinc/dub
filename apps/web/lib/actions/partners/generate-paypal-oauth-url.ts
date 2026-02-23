"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getPayoutMethodsForCountry } from "@/lib/partners/get-payout-methods-for-country";
import { paypalOAuthProvider } from "@/lib/paypal/oauth";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { COUNTRIES } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

export const generatePaypalOAuthUrl = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, user, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.country) {
      throw new Error(
        "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
      );
    }

    const availablePayoutMethods = getPayoutMethodsForCountry({
      country: partner.country,
    });

    if (!availablePayoutMethods.includes(PartnerPayoutMethod.paypal)) {
      throw new Error(
        `Your current country (${COUNTRIES[partner.country]}) is not supported for PayPal payouts. Please go to partners.dub.co/settings to update your country, or contact support.`,
      );
    }

    return {
      url: await paypalOAuthProvider.generateAuthUrl(user.id),
    };
  },
);
