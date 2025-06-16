"use server";

import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authPartnerActionClient } from "../safe-action";

// TODO (kiran):
// Combine this with the updatePartnerProfileAction

const schema = z.object({
  invoiceInfo: z.string().max(1000).nullable(),
});

// Update a partner invoice info
export const updatePartnerInvoiceInfoAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { invoiceInfo } = parsedInput;

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        invoiceInfo,
      },
    });
  });
