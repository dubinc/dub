import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getBountySubmissions } from "@/lib/api/bounties/get-bounty-submissions";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/bounties/[bountyId]/submissions - get all submissions for a bounty
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { bountyId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const bounty = await getBountyOrThrow({
      bountyId,
      programId,
      include: {
        groups: true,
      },
    });

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
