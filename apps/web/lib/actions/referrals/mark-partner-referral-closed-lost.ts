"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { markPartnerReferralClosedLostSchema } from "@/lib/zod/schemas/partner-referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

// Mark a partner referral as closed lost
export const markPartnerReferralClosedLostAction = authActionClient
  .inputSchema(markPartnerReferralClosedLostSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partnerReferral = await prisma.partnerReferral.findUnique({
      where: {
        id: referralId,
      },
      include: {
        partner: true,
      },
    });

    if (!partnerReferral) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner referral not found.",
      });
    }

    if (partnerReferral.programId !== programId) {
      throw new DubApiError({
        code: "forbidden",
        message: "You don't have access to this partner referral.",
      });
    }

    if (partnerReferral.status === ReferralStatus.closedLost) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already marked as closed lost.",
      });
    }

    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        status: ReferralStatus.closedLost,
      },
    });

    await recordAuditLog({
      workspaceId: workspace.id,
      programId,
      action: "partner_referral.closed_lost",
      description: `Partner referral ${referralId} marked as closed lost`,
      actor: user,
      targets: [
        {
          type: "partner_referral",
          id: referralId,
          metadata: {
            email: partnerReferral.email,
            name: partnerReferral.name,
            company: partnerReferral.company,
          },
        },
        {
          type: "partner",
          id: partnerReferral.partnerId,
          metadata: partnerReferral.partner,
        },
      ],
    });

    return updatedReferral;
  });
