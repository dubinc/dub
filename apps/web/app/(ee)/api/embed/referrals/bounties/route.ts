import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/embed/referrals/bounties – get available bounties for the embedded partner program
export const GET = withReferralsEmbedToken(
  async ({ program, programEnrollment, group, links }) => {
    const now = new Date();
    const partnerGroupId = programEnrollment.groupId || program.defaultGroupId;

    const bounties = await prisma.bounty.findMany({
      where: {
        programId: program.id,
        startsAt: {
          lte: now,
        },
        AND: [
          {
            OR: [
              {
                groups: {
                  none: {},
                },
              },
              {
                groups: {
                  some: {
                    groupId: partnerGroupId,
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
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

    return NextResponse.json(
      z.array(PartnerBountySchema).parse(
        bounties.map((bounty) => ({
          ...bounty,
          submission: bounty.submissions?.[0] || null,
          performanceCondition: bounty.workflow?.triggerConditions?.[0] || null,
          partner: {
            ...aggregatePartnerLinksStats(links),
            totalCommissions: programEnrollment.totalCommissions,
          },
        })),
      ),
    );
  },
);
