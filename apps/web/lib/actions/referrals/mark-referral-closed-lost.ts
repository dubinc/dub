"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { notifyReferralStatusUpdate } from "@/lib/api/referrals/notify-referral-status-update";
import { markReferralClosedLostSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Mark a partner referral as closed lost
export const markReferralClosedLostAction = authActionClient
  .inputSchema(markReferralClosedLostSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, notes } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partnerReferral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (partnerReferral.status === ReferralStatus.closedLost) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already marked as closed lost.",
      });
    }

    await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        status: ReferralStatus.closedLost,
      },
    });

    waitUntil(
      notifyReferralStatusUpdate({
        referral: partnerReferral,
        programId,
        status: ReferralStatus.closedLost,
        notes,
      }),
    );
  });
