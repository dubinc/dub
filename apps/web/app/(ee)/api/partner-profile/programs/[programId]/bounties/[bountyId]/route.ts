import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  canPartnerSeeBounty,
  getEffectiveBountyPeriod,
} from "@/lib/bounty/api/bounty-availability";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/bounties/[bountyId] – get a single bounty for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { programId, bountyId } = params;

  const { program, links, ...programEnrollment } =
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {
        program: {
          select: {
            id: true,
            defaultGroupId: true,
          },
        },
        links: {
          select: {
            clicks: true,
            leads: true,
            conversions: true,
            sales: true,
            saleAmount: true,
          },
        },
      },
    });

  const bounty = await getBountyOrThrow({
    programId: program.id,
    bountyId,
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

  const canSeeBounty = canPartnerSeeBounty({
    program,
    bounty,
    programEnrollment,
  });

  if (!canSeeBounty) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty not found.",
    });
  }

  const { startsAt, endsAt } = getEffectiveBountyPeriod({
    programEnrollment,
    bounty,
  });

  const { groups, ...bountyWithoutGroups } = bounty;

  return NextResponse.json(
    PartnerBountySchema.parse({
      ...bountyWithoutGroups,
      startsAt,
      endsAt,
      performanceCondition: bounty.workflow?.triggerConditions?.[0] || null,
      partner: {
        ...aggregatePartnerLinksStats(links),
        totalCommissions: programEnrollment.totalCommissions,
      },
    }),
  );
});
