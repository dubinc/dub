import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  BountySubmissionExtendedSchema,
  getBountySubmissionsQuerySchema,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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

    const { status, groupId, partnerId, sortOrder, sortBy, page, pageSize } =
      getBountySubmissionsQuerySchema.parse(searchParams);

    const submissions = await prisma.bountySubmission.findMany({
      where: {
        bountyId,
        status: status ?? {
          in: ["draft", "submitted", "approved"],
        },
        ...(groupId && {
          programEnrollment: {
            groupId,
          },
        }),
        ...(partnerId && {
          partnerId,
        }),
      },
      include: {
        user: true,
        commission: true,
        partner: true,
        programEnrollment: true,
      },
      orderBy: {
        [sortBy === "completedAt" ? "completedAt" : "performanceCount"]:
          sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const bountySubmissions = submissions.map(
      ({ partner, programEnrollment, commission, user, ...submissionData }) =>
        BountySubmissionExtendedSchema.parse({
          ...submissionData,
          partner: {
            ...partner,
            ...(programEnrollment || {}),
            id: partner.id,
            status: programEnrollment?.status ?? null,
          },
          commission,
          user,
        }),
    );

    return NextResponse.json(bountySubmissions);
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
