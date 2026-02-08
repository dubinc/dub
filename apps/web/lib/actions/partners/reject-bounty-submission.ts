"use server";

import { rejectBountySubmission } from "@/lib/api/bounties/reject-bounty-submission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectBountySubmissionBodySchema } from "@/lib/zod/schemas/bounties";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = rejectBountySubmissionBodySchema.extend({
  workspaceId: z.string(),
  submissionId: z.string(),
});

// Reject a bounty submission
export const rejectBountySubmissionAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rejectionReason, rejectionNote } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await rejectBountySubmission({
      programId,
      submissionId,
      rejectionReason,
      rejectionNote,
      user,
    });
  });
