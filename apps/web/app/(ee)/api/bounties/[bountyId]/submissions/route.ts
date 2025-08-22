import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { Bounty, BountyGroup, BountyType } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

// TODO:
// Add filter, pagination

// GET /api/bounties/[bountyId]/submissions - get all submissions for a bounty
export const GET = withWorkspace(async ({ workspace, params }) => {
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

  const results =
    bounty.type === BountyType.submission
      ? await getSubmissions(bounty)
      : await getActivePartners(bounty);

  return NextResponse.json(z.array(BountySubmissionSchema).parse(results));
});

// Get the submissions for a bounty of the type `submission`
async function getSubmissions(bounty: Pick<Bounty, "id">) {
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
      createdAt: "desc",
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

// Get active partners regardless of progress for `performance` bounties
async function getActivePartners(bounty: Bounty & { groups: BountyGroup[] }) {
  // TODO:
  // Sort the list by the performance attribute


  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId: bounty.programId,
      ...(bounty.groups.length > 0
        ? {
            groupId: {
              in: bounty.groups.map(({ groupId }) => groupId),
            },
          }
        : {}),
      status: {
        in: ["approved", "invited"],
      },
    },
    include: {
      links: true,
      partner: true,
      bountySubmissions: {
        where: {
          bountyId: bounty.id,
        },
        include: {
          user: true,
          commission: true,
        },
      },
    },
  });

  const results = programEnrollments.map(
    ({ links, partner, bountySubmissions, ...programEnrollment }) => {
      const { leads, conversions, saleAmount } = links?.reduce(
        (acc, link) => {
          return {
            leads: acc.leads + link.leads,
            conversions: acc.conversions + link.conversions,
            saleAmount: acc.saleAmount + link.saleAmount,
          };
        },
        { leads: 0, conversions: 0, saleAmount: 0 },
      );

      return {
        partner: {
          ...partner,
          ...programEnrollment,
          leads,
          conversions,
          saleAmount,
        },
        submission: bountySubmissions[0] ?? null,
        commission: bountySubmissions[0]?.commission ?? null,
        user: bountySubmissions[0]?.user ?? null,
      };
    },
  );

  return results;
}
