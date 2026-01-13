"use server";

import { rejectBountySubmission } from "@/lib/api/bounties/reject-bounty-submission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { rejectBountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { authActionClient } from "../safe-action";

// Reject a bounty submission
export const rejectBountySubmissionAction = authActionClient
  .inputSchema(rejectBountySubmissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rejectionReason, rejectionNote } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await rejectBountySubmission({
      programId,
      submissionId,
      rejectionReason,
      rejectionNote,
      user,
    });
  });
