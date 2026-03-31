"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const retryFailedPaypalPayoutSchema = z.object({
  payoutId: z.string().min(1, "Payout ID is required"),
});

// Retry a failed PayPal payout for a partner
export const retryFailedPaypalPayoutsAction = authPartnerActionClient
  .inputSchema(retryFailedPaypalPayoutSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { payoutId } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        "You haven't enabled payouts yet. Please enable payouts in your payout settings.",
      );
    }

    if (!partner.paypalEmail) {
      throw new Error("Connect your PayPal account to enable payouts.");
    }

    const { success } = await ratelimit(1, "12 h").limit(
      `retry-failed-paypal-payouts:${payoutId}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
      );
    }

    // Use a transaction to atomically check and update the payout status
    // This prevents race conditions where multiple retry requests happen concurrently
    const updatedPayout = await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: {
          id: payoutId,
        },
        select: {
          id: true,
          invoiceId: true,
          partnerId: true,
          status: true,
          amount: true,
          paypalTransferId: true,
          program: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!payout) {
        throw new Error("Payout not found.");
      }

      if (payout.partnerId !== partner.id) {
        throw new Error("You are not authorized to retry this payout.");
      }

      if (payout.status !== "failed") {
        throw new Error(
          `This payout cannot be retried. Current status: ${payout.status}. Only failed payouts can be retried.`,
        );
      }

      if (!payout.paypalTransferId) {
        throw new Error("This payout has no existing PayPal transfer ID.");
      }

      if (!payout.invoiceId) {
        throw new Error("This payout has no invoice ID.");
      }

      const updateResult = await tx.payout.updateMany({
        where: {
          id: payout.id,
          status: "failed", // Only update if still in "failed" status
        },
        data: {
          status: "processing",
        },
      });

      // If no rows were updated, another request already processed this payout
      if (updateResult.count === 0) {
        throw new Error(
          "This payout is already being processed or has been sent. Please wait for it to complete.",
        );
      }

      return payout;
    });

    try {
      await createPayPalBatchPayout({
        invoiceId: `${updatedPayout.invoiceId}-${nanoid(7)}`,
        payouts: [
          {
            id: updatedPayout.id,
            amount: updatedPayout.amount,
            program: updatedPayout.program,
            partner: {
              paypalEmail: partner.paypalEmail,
            },
          },
        ],
      });

      // Update status to "sent" after successful PayPal batch creation
      await prisma.payout.update({
        where: {
          id: updatedPayout.id,
        },
        data: {
          status: "sent",
        },
      });
    } catch (error) {
      // If PayPal batch creation fails, revert status back to "failed" so payout can be retried
      await prisma.payout.update({
        where: {
          id: updatedPayout.id,
        },
        data: {
          status: "failed",
        },
      });

      throw new Error(
        "Failed to retry payout. Please try again or contact support.",
      );
    }
  });
