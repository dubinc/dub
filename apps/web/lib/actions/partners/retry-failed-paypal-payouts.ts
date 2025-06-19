"use server";

import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const retryFailedPaypalPayoutSchema = z.object({
  payoutId: z.string().min(1, "Payout ID is required"),
});

// Retry a failed PayPal payout for a partner
export const retryFailedPaypalPayoutsAction = authPartnerActionClient
  .schema(retryFailedPaypalPayoutSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { payoutId } = parsedInput;

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        "You haven't enabled payouts yet. Please enable payouts in your payout settings.",
      );
    }

    if (!partner.paypalEmail) {
      throw new Error("Connect your PayPal account to enable payouts.");
    }

    const { success } = await ratelimit(5, "24 h").limit(
      `retry-failed-paypal-payouts:${partner.id}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of retry attempts for the past 24 hours. Please wait and try again later.",
      );
    }

    const payout = await prisma.payout.findUniqueOrThrow({
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

    if (payout.partnerId !== partner.id) {
      throw new Error("You are not authorized to retry this payout.");
    }

    if (payout.status !== "failed") {
      throw new Error(
        "This payout cannot be retried (you can only retry failed payouts).",
      );
    }

    if (!payout.invoiceId) {
      throw new Error("This payout has no invoice ID.");
    }

    if (!payout.paypalTransferId) {
      throw new Error("This payout has no existing PayPal transfer ID.");
    }

    try {
      await createPayPalBatchPayout({
        invoiceId: `${payout.invoiceId}-${nanoid(7)}`,
        payouts: [
          {
            id: payout.id,
            amount: payout.amount,
            program: payout.program,
            partner: {
              paypalEmail: partner.paypalEmail,
            },
          },
        ],
      });
    } catch (error) {
      throw new Error(
        "Failed to retry payout. Please try again or contact support.",
      );
    }
  });
