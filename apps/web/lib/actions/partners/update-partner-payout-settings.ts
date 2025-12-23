"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { partnerPayoutSettingsSchema } from "../../zod/schemas/partners";
import { authPartnerActionClient } from "../safe-action";

// Update a partner payout & invoice settings
export const updatePartnerPayoutSettingsAction = authPartnerActionClient
  .schema(partnerPayoutSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { companyName, address, taxId } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

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
      },
    });
  });
