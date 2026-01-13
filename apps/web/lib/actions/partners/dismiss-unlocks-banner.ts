"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { prisma } from "@dub/prisma";
import { authPartnerActionClient } from "../safe-action";

export const dismissUnlocksBannerAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "partner_profile.update",
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        unlocksCompletedAt: new Date(),
      },
    });

    return { success: true };
  },
);
