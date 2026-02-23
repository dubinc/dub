"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { prisma } from "@dub/prisma";
import { partnerPayoutSettingsSchema } from "../../zod/schemas/partners";
import { authPartnerActionClient } from "../safe-action";

export const updatePartnerPayoutSettingsAction = authPartnerActionClient
  .inputSchema(partnerPayoutSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { companyName, address, taxId } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    const hasInvoiceUpdate = address !== undefined || taxId !== undefined;

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        companyName,
        ...(hasInvoiceUpdate && {
          invoiceSettings: {
            ...(address !== undefined && {
              address: address || null,
            }),
            ...(taxId !== undefined && {
              taxId: taxId || null,
            }),
          },
        }),
      },
    });
  });
