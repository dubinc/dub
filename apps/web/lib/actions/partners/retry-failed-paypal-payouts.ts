"use server";

import { createPayPalBatchPayout } from "@/lib/paypal/create-batch-payout";
import { prisma } from "@dub/prisma";
import { authPartnerActionClient } from "../safe-action";

// Retry failed PayPal payouts for a partner
export const retryFailedPaypalPayoutsAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner } = ctx;

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        "You haven't enabled payouts yet. Please enable payouts in your payout settings.",
      );
    }

    if (!partner.paypalEmail) {
      throw new Error("Connect your PayPal account to enable payouts.");
    }

    const failedPayouts = await prisma.payout.findMany({
      where: {
        partnerId: partner.id,
        status: "failed",
        paypalTransferId: {
          not: null,
        },
      },
      select: {
        id: true,
        invoiceId: true,
        amount: true,
        program: {
          select: {
            name: true,
          },
        },
      },
    });

    if (failedPayouts.length === 0) {
      throw new Error("No failed payouts found.");
    }

    const payoutsByInvoiceId = Object.entries(
      failedPayouts.reduce<
        Record<
          string,
          {
            id: string;
            amount: number;
            program: { name: string };
            partner: { paypalEmail: string };
          }[]
        >
      >((acc, payout) => {
        if (payout.invoiceId) {
          acc[payout.invoiceId] = acc[payout.invoiceId] || [];
          acc[payout.invoiceId].push({
            id: payout.id,
            amount: payout.amount,
            program: payout.program,
            partner: { paypalEmail: partner.paypalEmail! },
          });
        }

        return acc;
      }, {}),
    ).map(([invoiceId, payouts]) => ({
      invoiceId,
      payouts,
    }));

    await Promise.allSettled(
      payoutsByInvoiceId.map(({ invoiceId, payouts }) =>
        createPayPalBatchPayout({
          program: payouts[0].program,
          payouts,
          invoiceId,
        }),
      ),
    );
  },
);
