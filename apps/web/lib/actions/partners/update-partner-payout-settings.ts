"use server";

import { createStripeTransfer } from "@/lib/partners/create-stripe-transfer";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { partnerPayoutSettingsSchema } from "../../zod/schemas/partners";
import { authPartnerActionClient } from "../safe-action";

// Update a partner payout & invoice settings
export const updatePartnerPayoutSettingsAction = authPartnerActionClient
  .schema(partnerPayoutSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { companyName, address, taxId, minWithdrawalAmount } = parsedInput;

    const invoiceSettings = {
      address: address || undefined,
      taxId: taxId || undefined,
    } as Prisma.JsonObject;

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        companyName,
        invoiceSettings,
        minWithdrawalAmount,
      },
    });

    waitUntil(
      (async () => {
        // if the partner has verified Stripe payouts set up and the minimum withdrawal amount has changed,
        // we need to create a Stripe transfer for the previously processed payouts (if any are present)
        if (
          updatedPartner.stripeConnectId &&
          updatedPartner.payoutsEnabledAt &&
          updatedPartner.minWithdrawalAmount !== partner.minWithdrawalAmount
        ) {
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
