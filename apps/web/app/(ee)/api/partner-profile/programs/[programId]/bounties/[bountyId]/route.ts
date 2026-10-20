import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  bountyEligibilityIncludes,
  canPartnerSeeBounty,
  programEnrollmentEligibilityIncludes,
} from "@/lib/bounty/api/bounty-availability";
import { toPartnerBounty } from "@/lib/bounty/api/get-bounties-for-partner";
import { getBountyOrThrow } from "@/lib/bounty/api/get-bounty-or-throw";
import {
  aggregatePartnerLinksStats,
  partnerLinkStatsSelect,
} from "@/lib/partners/aggregate-partner-links-stats";
import { hidePartnerTotalSaleAmount } from "@/lib/partners/hide-partner-revenue";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/bounties/[bountyId] – get a single bounty for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { programId, bountyId } = params;

  const { program, links, partnerGroup, ...programEnrollment } =
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
          select: partnerLinkStatsSelect,
        },
        partnerGroup: {
          select: {
            revenueDataSharingDisabledAt: true,
          },
        },
        ...programEnrollmentEligibilityIncludes,
      },
    });

  const bounty = await getBountyOrThrow({
    programId: program.id,
    bountyId,
    include: {
      ...bountyEligibilityIncludes,
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
          commissions: {
            select: {
              id: true,
              earnings: true,
              status: true,
              description: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "asc",
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

  const partnerBounty = toPartnerBounty({
    bounty,
    programEnrollment,
    partnerLinksStats: aggregatePartnerLinksStats(links),
  });

  return NextResponse.json(
    PartnerBountySchema.parse({
      ...partnerBounty,
      partner: hidePartnerTotalSaleAmount(partnerBounty.partner, partnerGroup),
    }),
  );
});
