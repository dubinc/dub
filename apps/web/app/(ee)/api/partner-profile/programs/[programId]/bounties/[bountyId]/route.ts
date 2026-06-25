import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  bountyEligibilityIncludes,
  throwIfPartnerCannotViewBounty,
} from "@/lib/bounty/api/bounty-eligibility";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import { getEffectiveBountyDateRange } from "@/lib/bounty/bounty-timing";
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
        program: true,
        links: true,
        programPartnerTags: {
          select: {
            partnerTagId: true,
          },
        },
      },
    });

  const bounty = await getBountyOrThrow({
    bountyId,
    programId: program.id,
    include: {
      workflow: {
        select: {
          triggerConditions: true,
        },
      },
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
      ...bountyEligibilityIncludes,
    },
  });

  throwIfPartnerCannotViewBounty({
    programEnrollment,
    bounty,
  });

  const { startsAt, endsAt } = getEffectiveBountyDateRange({
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
