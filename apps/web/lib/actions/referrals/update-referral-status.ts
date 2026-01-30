"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getReferralOrThrow } from "@/lib/api/referrals/get-referral-or-throw";
import { REFERRAL_STATUS_TRANSITIONS } from "@/lib/referrals/constants";
import { updateReferralStatusSchema } from "@/lib/zod/schemas/referrals";
import { prisma } from "@dub/prisma";
import { ReferralStatus } from "@dub/prisma/client";
import { authActionClient } from "../safe-action";

// Unified action to update referral status
// TODO: Consolidate logic from existing actions:
// - mark-referral-qualified.ts (for status === "qualified")
// - mark-referral-unqualified.ts (for status === "unqualified")
// - mark-referral-closed-won.ts (for status === "closedWon")
// - mark-referral-closed-lost.ts (for status === "closedLost")

export const updateReferralStatusAction = authActionClient
  .inputSchema(updateReferralStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { referralId, status, notes } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const referral = await getReferralOrThrow({
      referralId,
      programId,
    });

    if (!REFERRAL_STATUS_TRANSITIONS[referral.status].includes(status)) {
      throw new Error(
        `Invalid status transition from ${referral.status} to ${status}`,
      );
    }

    await prisma.partnerReferral.update({
      where: {
        id: referralId,
        status: ReferralStatus.pending,
      },
      data: {
        status: ReferralStatus.qualified,
      },
    });

    throw new Error("Not implemented yet");
  });
