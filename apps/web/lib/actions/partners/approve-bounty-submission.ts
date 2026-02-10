"use server";

import { approveBountySubmission } from "@/lib/api/bounties/approve-bounty-submission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { approveBountySubmissionBodySchema } from "@/lib/zod/schemas/bounties";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = approveBountySubmissionBodySchema.extend({
  workspaceId: z.string(),
  submissionId: z.string(),
});

// Approve a submission for a bounty
export const approveBountySubmissionAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rewardAmount } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approveBountySubmission({
      programId,
      submissionId,
      rewardAmount,
      user,
    });
  });
