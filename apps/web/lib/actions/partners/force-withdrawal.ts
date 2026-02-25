"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { createStablecoinPayout } from "@/lib/partners/create-stablecoin-payout";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { ratelimit } from "@/lib/upstash";
import { authPartnerActionClient } from "../safe-action";

// Force a withdrawal for a partner (even if the total amount is below the minimum withdrawal amount)
export const forceWithdrawalAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    const { success } = await ratelimit(1, "1 h").limit(
      `force-withdrawal:${partner.id}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
      );
    }

    if (!partner.defaultPayoutMethod) {
      throw new Error(
        "No default payout method found. Please contact support to set one.",
      );
    }

    if (partner.defaultPayoutMethod === "connect") {
      await createStripeTransfer({
        partnerId: partner.id,
        forceWithdrawal: true,
      });
      return;
    }

    if (partner.defaultPayoutMethod === "stablecoin") {
      await createStablecoinPayout({
        partnerId: partner.id,
        forceWithdrawal: true,
      });
      return;
    }

    throw new Error(
      "Invalid default payout method found. Please contact support to set one.",
    );
  },
);
