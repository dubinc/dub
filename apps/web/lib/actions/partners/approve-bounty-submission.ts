"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
});

export const approveBountySubmissionAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const bountySubmission = await prisma.bountySubmission.findUniqueOrThrow({
      where: {
        id: submissionId,
      },
    });

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status === "approved") {
      throw new Error("Bounty submission already approved.");
    }

    await prisma.bountySubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        userId: user.id,
      },
    });

    // TODO:
    // Record audit log
  });
