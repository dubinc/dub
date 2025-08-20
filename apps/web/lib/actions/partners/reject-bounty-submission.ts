"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";
import { BountySubmissionRejectionReason } from "@dub/prisma/client";

const schema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
  rejectionReason: z.nativeEnum(BountySubmissionRejectionReason),
  rejectionNote: z.string().trim().max(500).optional(),
});

// Reject a bounty submission
export const rejectBountySubmissionAction = authActionClient
  .schema(schema)
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

    await prisma.bountySubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "rejected",
        reviewedAt: new Date(),
        userId: user.id,
        rejectionReason,
        rejectionNote,
      },
    });

    // TODO:
    // Record audit log
  });
