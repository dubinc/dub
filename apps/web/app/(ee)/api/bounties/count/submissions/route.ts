import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { BountySubmissionStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const bountiesSubmissionsCountQuerySchema = z.object({
  bountyId: z.string().optional(),
});

const statuses = Object.values(BountySubmissionStatus);

// GET /api/bounties/count/submissions – get the total bounty submissions count by status (potentially filtered by bountyId)
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { bountyId } =
      bountiesSubmissionsCountQuerySchema.parse(searchParams);

    const count = await prisma.bountySubmission.groupBy({
      by: ["status"],
      where: {
        programId,
        bountyId,
      },
      _count: true,
    });

    const counts = count.map((c) => ({
      status: c.status,
      count: c._count,
    }));

    statuses.forEach((status) => {
      if (!counts.some((c) => c.status === status)) {
        counts.push({
          status,
          count: 0,
        });
      }
    });

    return NextResponse.json(counts);
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
