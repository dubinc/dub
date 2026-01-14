import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
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

    return NextResponse.json(BountySubmissionSchema.parse(submission));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
