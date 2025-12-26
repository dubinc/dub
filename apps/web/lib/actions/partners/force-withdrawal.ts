"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS } from "@/lib/constants/payouts";
import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { currencyFormatter } from "@dub/utils";
import { authPartnerActionClient } from "../safe-action";

// Force a withdrawal for a partner (even if the total amount is below the minimum withdrawal amount)
export const forceWithdrawalAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        "You haven't enabled payouts yet. Please enable payouts in your payout settings.",
      );
    }

    const { success } = await ratelimit(5, "24 h").limit(
      `force-withdrawal:${partner.id}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
      );
    }

    const previouslyProcessedPayouts = await prisma.payout.findMany({
      where: {
        partnerId: partner.id,
        status: "processed",
        stripeTransferId: null,
      },
      include: {
        program: {
          select: {
            name: true,
          },
        },
      },
    });

    if (previouslyProcessedPayouts.length === 0) {
      throw new Error(
        "No previously processed payouts found. Please try again or contact support.",
      );
    }

    const totalProcessedAmount = previouslyProcessedPayouts.reduce(
      (acc, payout) => acc + payout.amount,
      0,
    );
    if (totalProcessedAmount < MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS) {
      throw new Error(
        `Your current processed payouts balance (${currencyFormatter(totalProcessedAmount)}) is less than the minimum amount required for withdrawal (${currencyFormatter(MIN_FORCE_WITHDRAWAL_AMOUNT_CENTS)}).`,
      );
    }

    try {
      await createStripeTransfer({
        partner,
        previouslyProcessedPayouts,
        forceWithdrawal: true,
      });
    } catch (error) {
      throw new Error(
        "Failed to force withdrawal. Please try again or contact support.",
      );
    }
  },
);
