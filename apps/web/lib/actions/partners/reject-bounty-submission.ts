"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectBountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { authActionClient } from "../safe-action";

// Reject a bounty submission
export const rejectBountySubmissionAction = authActionClient
  .schema(rejectBountySubmissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rejectionReason, rejectionNote } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const bountySubmission = await prisma.bountySubmission.findUniqueOrThrow({
      where: {
        id: submissionId,
      },
    });

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status === "rejected") {
      throw new Error("Bounty submission already rejected.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.bountySubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
          userId: user.id,
          rejectionReason,
          rejectionNote,
          commissionId: null,
        },
      });

      if (bountySubmission.commissionId) {
        await tx.commission.update({
          where: {
            id: bountySubmission.commissionId,
          },
          data: {
            status: "canceled",
            payoutId: null,
          },
        });
      }
    });

    // TODO:
    // Record audit log
  });
