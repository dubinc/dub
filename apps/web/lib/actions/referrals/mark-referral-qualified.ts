"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { markReferralQualifiedSchema } from "@/lib/zod/schemas/partner-referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

// Mark a partner referral as qualified
export const markReferralQualifiedAction = authActionClient
  .inputSchema(markReferralQualifiedSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { referralId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partnerReferral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (partnerReferral.status === ReferralStatus.qualified) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already qualified.",
      });
    }

    const updatedReferral = await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        status: ReferralStatus.qualified,
      },
    });

    await recordAuditLog({
      workspaceId: workspace.id,
      programId,
      action: "partner_referral.qualified",
      description: `Partner referral ${referralId} qualified`,
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
