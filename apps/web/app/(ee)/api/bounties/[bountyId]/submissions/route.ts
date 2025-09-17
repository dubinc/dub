import { getPartnersWithBountySubmission } from "@/lib/api/bounties/get-partners-with-bounty-submission";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { BountySubmissionsQueryFilters } from "@/lib/types";
import {
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { BountyType } from "@dub/prisma/client";
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

    const results =
      bounty.type === BountyType.submission
        ? await getSubmissions({
            ...filters,
            bountyId: bounty.id,
          })
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

// Get the submissions for a bounty of the type `submission`
async function getSubmissions({
  bountyId,
  sortOrder,
  page,
  pageSize,
  status,
  groupId,
}: BountySubmissionsQueryFilters & {
  bountyId: string;
}) {
  const submissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId,
      ...(status ? { status } : { status: { not: "rejected" } }),
      ...(groupId && {
        programEnrollment: {
          groupId,
        },
      }),
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
      createdAt: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return submissions.map((submission) => {
    return {
      partner: {
        ...submission.programEnrollment?.partner,
        ...submission.programEnrollment,
        // here's we're making sure the programEnrollment ID doesn't override the actual partner ID
        // TODO: this is a bit messy, we should refactor this
        id: submission.programEnrollment?.partnerId,
      },
      submission,
      commission: submission.commission,
      user: submission.user,
    };
  });
}
