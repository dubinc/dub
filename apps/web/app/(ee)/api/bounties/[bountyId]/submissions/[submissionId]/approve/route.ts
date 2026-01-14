import { approveBountySubmission } from "@/lib/api/bounties/approve-bounty-submission";
import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { approveBountySubmissionBodySchema } from "@/lib/zod/schemas/bounties";
import { NextResponse } from "next/server";

// POST /api/bounties/[bountyId]/submissions/[submissionId]/approve - approve a submission
export const POST = withWorkspace(
  async ({ workspace, params, req, session }) => {
    const { bountyId, submissionId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    let body;
    try {
      body = await parseRequestBody(req);
    } catch (e) {
      // If body is empty or invalid, use empty object since body is optional
      body = {};
    }

    const { rewardAmount } = approveBountySubmissionBodySchema.parse(body);

    await getBountyOrThrow({
      bountyId,
      programId,
    });

    const approvedSubmission = await approveBountySubmission({
      programId,
      bountyId,
      submissionId,
      rewardAmount,
      user: session.user,
    });

    return NextResponse.json(approvedSubmission);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
