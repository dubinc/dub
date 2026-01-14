"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { markPartnerReferralClosedWonSchema } from "@/lib/zod/schemas/partner-referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

// Mark a partner referral as closed won
export const markPartnerReferralClosedWonAction = authActionClient
  .inputSchema(markPartnerReferralClosedWonSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId, saleAmount, stripeCustomerId } = parsedInput;

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

    if (partnerReferral.status === ReferralStatus.closedWon) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already marked as closed won.",
      });
    }

    // Update formData to include sale amount and Stripe customer ID
    const formData =
      (partnerReferral.formData as Record<string, unknown>) || {};
    const updatedFormData = {
      ...formData,
      saleAmount,
      stripeCustomerId: stripeCustomerId || null,
    };

    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        status: ReferralStatus.closedWon,
        formData: updatedFormData,
      },
    });

    await recordAuditLog({
      workspaceId: workspace.id,
      programId,
      action: "partner_referral.closed_won",
      description: `Partner referral ${referralId} marked as closed won with sale amount $${(saleAmount / 100).toFixed(2)}`,
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
      metadata: {
        saleAmount,
        stripeCustomerId: stripeCustomerId || null,
      },
    });

    return updatedReferral;
  });
