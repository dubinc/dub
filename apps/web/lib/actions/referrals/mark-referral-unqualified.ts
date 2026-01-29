"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { notifyReferralStatusUpdate } from "@/lib/api/referrals/notify-referral-status-update";
import { markReferralUnqualifiedSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Mark a partner referral as unqualified
export const markReferralUnqualifiedAction = authActionClient
  .inputSchema(markReferralUnqualifiedSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, notes } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const partnerReferral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (partnerReferral.status === ReferralStatus.unqualified) {
      throw new DubApiError({
        code: "bad_request",
        message: "This partner referral is already unqualified.",
      });
    }

    await prisma.partnerReferral.update({
      where: {
        id: referralId,
      },
      data: {
        status: ReferralStatus.unqualified,
      },
    });

    waitUntil(
      notifyReferralStatusUpdate({
        referral: partnerReferral,
        programId,
        status: ReferralStatus.unqualified,
        notes,
      }),
    );
  });
