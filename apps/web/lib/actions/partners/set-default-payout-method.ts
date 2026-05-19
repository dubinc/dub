"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getPartnerPayoutMethods } from "@/lib/payouts/get-partner-payout-methods";
import { setDefaultPayoutMethodSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { authPartnerActionClient } from "../safe-action";

export const setDefaultPayoutMethodAction = authPartnerActionClient
  .inputSchema(setDefaultPayoutMethodSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { type } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "payout_settings.update",
    });

    const payoutMethods = await getPartnerPayoutMethods(partner);
    const method = payoutMethods.find((m) => m.type === type);

    if (!method) {
      throw new Error("This payout method is not available.");
    }

    if (!method.connected) {
      throw new Error("This payout method is not connected.");
    }

    if (method.default) {
      throw new Error("Already the default payout method.");
    }

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        defaultPayoutMethod: type,
      },
    });
  });
