import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { rejectBountySubmission } from "@/lib/api/bounties/reject-bounty-submission";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { rejectBountySubmissionBodySchema } from "@/lib/zod/schemas/bounties";
import { NextResponse } from "next/server";

// POST /api/bounties/[bountyId]/submissions/[submissionId]/reject - reject a submission
export const POST = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { bountyId, submissionId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { rejectionReason, rejectionNote } =
      rejectBountySubmissionBodySchema.parse(await parseRequestBody(req));

    await getBountyOrThrow({
      bountyId,
      programId,
    });

    const rejectedSubmission = await rejectBountySubmission({
      programId,
      bountyId,
      submissionId,
      rejectionReason,
      rejectionNote,
      user: session.user,
    });

    return NextResponse.json(rejectedSubmission);
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
