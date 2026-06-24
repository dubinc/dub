import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  bountyEligibilityIncludes,
  throwIfPartnerNotEligibleForBounty,
} from "@/lib/bounty/api/bounty-eligibility";
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

  if (bounty.startsAt > new Date()) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty has not started yet.",
    });
  }

  const partnerTagIds = programEnrollment.programPartnerTags.map(
    (t) => t.partnerTagId,
  );
  const bountyGroupIds = bounty.groups.map((g) => g.groupId);
  const bountyTagIds = bounty.partnerTags.map((t) => t.partnerTagId);

  throwIfPartnerNotEligibleForBounty({
    bountyGroupIds,
    bountyTagIds,
    partnerGroupId: programEnrollment.groupId,
    partnerTagIds,
  });

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
