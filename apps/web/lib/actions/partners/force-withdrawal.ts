"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
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

    const { success } = await ratelimit(10, "24 h").limit(
      `force-withdrawal:${partner.id}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
      );
    }

    await createStripeTransfer({
      partnerId: partner.id,
      forceWithdrawal: true,
    });
  },
);
