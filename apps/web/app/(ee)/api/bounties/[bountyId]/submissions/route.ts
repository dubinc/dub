import { getBountySubmissions } from "@/lib/api/bounties/get-bounty-submissions";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/bounties/[bountyId]/submissions - get all submissions for a bounty
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: {
        id: bountyId,
      },
      include: {
        groups: true,
      },
    });

    if (bounty.programId !== programId) {
      throw new DubApiError({
        code: "not_found",
        message: `Bounty ${bountyId} not found.`,
      });
    }

    const filters = getBountySubmissionsQuerySchema.parse(searchParams);

    const bountySubmissions = await getBountySubmissions({
      ...filters,
      bountyId: bounty.id,
    });

    return NextResponse.json(
      z.array(BountySubmissionExtendedSchema).parse(bountySubmissions),
    );
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
