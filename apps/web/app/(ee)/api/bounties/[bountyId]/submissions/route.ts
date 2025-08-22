import { getPartnersWithBountySubmission } from "@/lib/api/bounties/get-partners-with-bounty-submission";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Bounty, BountyType } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// TODO:
// Add filter, pagination

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

    const results =
      bounty.type === BountyType.submission
        ? await getSubmissions(bounty, filters)
        : await getPartnersWithBountySubmission({
            ...filters,
            programId: bounty.programId,
            bountyId: bounty.id,
            groupIds: bounty.groups.map(({ groupId }) => groupId),
          });

    return NextResponse.json(
      z.array(BountySubmissionExtendedSchema).parse(results),
    );
  },
);

// Get the submissions for a bounty of the type `submission`
async function getSubmissions(bounty: Pick<Bounty, "id">, filters: any) {
  // For submission-type bounties, only allow sorting by createdAt
  const sortBy = filters.sortBy === "createdAt" ? "createdAt" : "createdAt";
  
  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId: bounty.id,
    },
    include: {
      user: true,
      commission: true,
      programEnrollment: {
        include: {
          partner: true,
        },
      },
    },
    orderBy: {
      [sortBy]: filters.sortOrder,
    },
  });

  const results = submissions.map((submission) => {
    return {
      partner: {
        ...submission.programEnrollment?.partner,
        ...submission.programEnrollment,
      },
      submission,
      commission: submission.commission,
      user: submission.user,
    };
  });

  return results;
}
