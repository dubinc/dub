"use server";

import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

// TODO
// See if we can combine this with the updatePartnerProfileAction

const schema = z.object({
  minWithdrawalAmount: z
    .enum(["1000", "2000", "5000", "10000"])
    .describe("Amount in cents"),
});

// Update a partner withdrawal amount
export const updatePartnerWithdrawalAmountAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { minWithdrawalAmount } = parsedInput;

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        minWithdrawalAmount: parseInt(minWithdrawalAmount),
      },
    });

    waitUntil(
      (async () => {
        if (updatedPartner.stripeConnectId && updatedPartner.payoutsEnabledAt) {
          const previouslyProcessedPayouts = await prisma.payout.findMany({
            where: {
              partnerId: updatedPartner.id,
              status: "processed",
              stripeTransferId: null,
            },
          });

          if (previouslyProcessedPayouts.length > 0) {
            await createStripeTransfer({
              partner: updatedPartner,
              previouslyProcessedPayouts,
            });
          }
        }
      })(),
    );
  });
