"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { authPartnerActionClient } from "../safe-action";

// Submit a partner network profile
export const submitNetworkProfileAction = authPartnerActionClient.action(
  async ({ ctx }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "partner_profile.update",
    });

    if (partner.networkStatus !== "draft") {
      throw new Error("Partner network profile not in 'draft' status");
    }

    const partnerChangeHistoryLog = partner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(partner.changeHistoryLog)
      : [];

    partnerChangeHistoryLog.push({
      field: "networkStatus",
      from: partner.networkStatus,
      to: "submitted",
      changedAt: new Date(),
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        networkStatus: "submitted",
        changeHistoryLog: partnerChangeHistoryLog,
      },
    });
  },
);
