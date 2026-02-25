"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { createStablecoinPayout } from "@/lib/partners/create-stablecoin-payout";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { ratelimit, redis } from "@/lib/upstash";
import { authPartnerActionClient } from "../safe-action";

// Force a withdrawal for a partner (even if the total amount is below the minimum withdrawal amount)
export const forceWithdrawalAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.defaultPayoutMethod) {
      throw new Error(
        "No default payout method found. Please contact support to set one.",
      );
    }

    if (!["connect", "stablecoin"].includes(partner.defaultPayoutMethod)) {
      throw new Error(
        "Invalid default payout method found. Please contact support to set one.",
      );
    }

    const { success } = await ratelimit(1, "1 h").limit(
      `force-withdrawal:${partner.id}`,
    );

    // if (!success) {
    //   throw new Error(
    //     "You've reached the maximum number of force withdrawal attempts for the past hour. Please wait and try again later.",
    //   );
    // }

    const lockKey = `force-withdrawal:lock:${partner.id}`;
    const acquired = await redis.set(lockKey, "1", { nx: true, ex: 60 });

    if (!acquired) {
      throw new Error(
        "A withdrawal is already in progress. Please wait for it to complete.",
      );
    }

    try {
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
    } finally {
      await redis.del(lockKey);
    }
  },
);
