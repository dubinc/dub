"use server";

import { partnerInvoiceSettingsSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";
import { authPartnerActionClient } from "../safe-action";

// Update a partner invoice settings
export const updatePartnerInvoiceSettingsAction = authPartnerActionClient
  .schema(partnerInvoiceSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { companyName, address, taxId } = parsedInput;

    const invoiceSettings = {
      address,
      taxId,
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
