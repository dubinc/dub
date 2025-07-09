"use server";

import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
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

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        companyName,
        invoiceSettings,
        minWithdrawalAmount,
      },
    });
  });
