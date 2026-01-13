import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { transformBountySubmission } from "@/lib/api/bounties/transform-bounty-submission";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/bounties/[bountyId]/submissions/[submissionId] - get a single submission
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { bountyId, submissionId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getBountyOrThrow({
      bountyId,
      programId,
    });

    const submission = await prisma.bountySubmission.findUnique({
      where: {
        id: submissionId,
      },
      include: {
        user: true,
        commission: true,
        partner: true,
        programEnrollment: true,
      },
    });

    if (!submission) {
      throw new DubApiError({
        code: "not_found",
        message: `Bounty submission ${submissionId} not found.`,
      });
    }

    if (submission.bountyId !== bountyId) {
      throw new DubApiError({
        code: "not_found",
        message: `Bounty submission ${submissionId} not found.`,
      });
    }

    return NextResponse.json(transformBountySubmission(submission));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
