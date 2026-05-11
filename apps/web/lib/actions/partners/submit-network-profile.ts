"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { sendEmail } from "@dub/email";
import NetworkPartnerApplicationSubmitted from "@dub/email/templates/network-partner-application-submitted";
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

    const partnerProfile = await prisma.partner.findUniqueOrThrow({
      where: {
        id: partner.id,
      },
      include: {
        platforms: true,
        preferredEarningStructures: true,
        salesChannels: true,
      },
    });

    const { isComplete } = getNetworkProfileChecklistProgress({
      partner: {
        ...partnerProfile,
        preferredEarningStructures:
          partnerProfile.preferredEarningStructures.map(
            ({ preferredEarningStructure }) => preferredEarningStructure,
          ),
        salesChannels: partnerProfile.salesChannels.map(
          ({ salesChannel }) => salesChannel,
        ),
      },
    });

    if (!isComplete) {
      throw new Error(
        "Please complete your partner profile to submit your application: https://partners.dub.co/profile",
      );
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
        submittedAt: new Date(),
      },
    });

    if (partner.email) {
      await sendEmail({
        to: partner.email,
        subject: "Dub Partner Network application submitted",
        variant: "notifications",
        react: NetworkPartnerApplicationSubmitted({
          name: partner.name,
          email: partner.email,
        }),
      });
    }
  },
);
