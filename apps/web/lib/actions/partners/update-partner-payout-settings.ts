"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { PartnerProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { partnerPayoutSettingsSchema } from "../../zod/schemas/partners";
import { authPartnerActionClient } from "../safe-action";

export const updatePartnerPayoutSettingsAction = authPartnerActionClient
  .inputSchema(partnerPayoutSettingsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { companyName, address, taxId, defaultPayoutMethod } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    if (
      defaultPayoutMethod &&
      !isPayoutMethodConnected({
        partner,
        defaultPayoutMethod,
      })
    ) {
      throw new Error(
        "Default payout method must be a connected account for this partner.",
      );
    }

    const hasInvoiceUpdate = address !== undefined || taxId !== undefined;

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        defaultPayoutMethod,
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

function isPayoutMethodConnected({
  partner,
  defaultPayoutMethod,
}: {
  partner: Pick<
    PartnerProps,
    "stripeConnectId" | "stripeRecipientId" | "paypalEmail"
  >;
  defaultPayoutMethod: PartnerPayoutMethod;
}) {
  switch (defaultPayoutMethod) {
    case PartnerPayoutMethod.connect:
      return Boolean(partner.stripeConnectId);
    case PartnerPayoutMethod.stablecoin:
      return Boolean(partner.stripeRecipientId);
    case PartnerPayoutMethod.paypal:
      return Boolean(partner.paypalEmail);
    default:
      return false;
  }
}
