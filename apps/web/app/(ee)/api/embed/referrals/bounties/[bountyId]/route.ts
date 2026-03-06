import { DubApiError } from "@/lib/api/errors";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/embed/referrals/bounties/[bountyId] – get a single bounty for the embedded partner program
export const GET = withReferralsEmbedToken(
  async ({ params, program, programEnrollment, links }) => {
    const { bountyId } = params;

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
            partnerId: programEnrollment.partnerId,
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
  },
);
