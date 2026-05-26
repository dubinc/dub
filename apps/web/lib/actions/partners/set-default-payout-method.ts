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

    if (!partner.payoutsEnabledAt) {
      throw new Error(
        `You haven't enabled payout yet. Please connect a payout method first.`,
      );
    }

    const payoutMethods = await getPartnerPayoutMethods(partner);
    const payoutMethod = payoutMethods.find((m) => m.type === type);

    if (!payoutMethod) {
      throw new Error("This payout method is not available for your country.");
    }

    if (!payoutMethod.connected) {
      throw new Error(
        "Please connect your payout method before setting it as your default.",
      );
    }

    if (payoutMethod.default) {
      throw new Error("This is already your default payout method.");
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
