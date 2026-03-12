import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/bounties/[bountyId] – get a single bounty for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { programId, bountyId } = params;

  const { program, links, ...programEnrollment } =
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        program: true,
        links: true,
      },
    });

  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
      programId: program.id,
    },
    include: {
      workflow: {
        select: {
          triggerConditions: true,
        },
      },
      groups: true,
      submissions: {
        where: {
          partnerId: partner.id,
        },
        include: {
          commission: {
            select: {
              id: true,
              earnings: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!bounty) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty not found.",
    });
  }

  if (bounty.startsAt > new Date()) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty not found.",
    });
  }

  const partnerGroupId = programEnrollment.groupId || program.defaultGroupId;
  const bountyGroupIds = bounty.groups.map((g) => g.groupId);
  const partnerCanSeeBounty =
    bountyGroupIds.length === 0 ||
    (partnerGroupId && bountyGroupIds.includes(partnerGroupId));

  if (!partnerCanSeeBounty) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty not found.",
    });
  }

  const { groups, ...bountyWithoutGroups } = bounty;

  return NextResponse.json(
    PartnerBountySchema.parse({
      ...bountyWithoutGroups,
      performanceCondition: bounty.workflow?.triggerConditions?.[0] || null,
      partner: {
        ...aggregatePartnerLinksStats(links),
        totalCommissions: programEnrollment.totalCommissions,
      },
    }),
  );
});
