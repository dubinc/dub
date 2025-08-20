import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { bountyStatsSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// TODO (kiran):
// Simplify this route

// GET /api/bounties/stats - get the stats for all bounties in a program
export const GET = withWorkspace(async ({ workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const [bounties, enrollmentsCount, pendingSubmissionsCounts] =
    await Promise.all([
      prisma.bounty.findMany({
        where: {
          programId,
        },
        include: {
          groups: {
            include: {
              partnerGroup: {
                include: {
                  _count: {
                    select: {
                      partners: {
                        where: {
                          status: "approved",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      }),

      prisma.programEnrollment.count({
        where: {
          programId,
          status: "approved",
        },
      }),

      prisma.bountySubmission.groupBy({
        by: ["bountyId"],
        where: {
          bounty: {
            programId,
          },
          status: "pending",
        },
        _count: true,
      }),
    ]);

  const pendingSubmissionsMap = pendingSubmissionsCounts.reduce(
    (acc, item) => {
      acc[item.bountyId] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  const result = bounties.map((bounty) => {
    const totalPartners = bounty.groups.reduce(
      (acc, group) => acc + group.partnerGroup._count.partners,
      0,
    );

    return {
      id: bounty.id,
      submissions: bounty._count.submissions,
      pendingSubmissions: pendingSubmissionsMap[bounty.id] || 0,
      partners: bounty.groups.length > 0 ? totalPartners : enrollmentsCount,
    };
  });

  return NextResponse.json(z.array(bountyStatsSchema).parse(result));
});
