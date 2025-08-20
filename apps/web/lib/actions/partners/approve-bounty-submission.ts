"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
});

// Approve a submission for a bounty
export const approveBountySubmissionAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const bountySubmission = await prisma.bountySubmission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        bounty: true,
      },
    });

    if (!bountySubmission) {
      throw new Error("Bounty submission not found.");
    }

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status === "approved") {
      throw new Error("Bounty submission already approved.");
    }

    const { bounty } = bountySubmission;

    if (bounty.type === "performance") {
      throw new Error("Performance based bounties cannot be approved.");
    }

    const commission = await createPartnerCommission({
      event: "custom",
      partnerId: bountySubmission.partnerId,
      programId: bountySubmission.programId,
      amount: bounty.rewardAmount,
      quantity: 1,
      user,
      description: `Commission for successfully completed "${bounty.name}" bounty.`,
    });

    if (!commission) {
      throw new Error("Failed to create commission for the bounty submission.");
    }

    await prisma.bountySubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        userId: user.id,
        rejectionNote: null,
        rejectionReason: null,
        commissionId: commission.id,
      },
    });

    // TODO:
    // Record audit log
  });
