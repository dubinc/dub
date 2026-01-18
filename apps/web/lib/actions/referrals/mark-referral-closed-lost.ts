"use server";

import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { markReferralClosedLostSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

// Mark a partner referral as closed lost
export const markReferralClosedLostAction = authActionClient
  .inputSchema(markReferralClosedLostSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId } = parsedInput;

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
  });
