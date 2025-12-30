import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { aggregatePartnerLinksStats } from "@/lib/partners/aggregate-partner-links-stats";
import { PartnerBountySchema } from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/[programId]/bounties – get available bounties for an enrolled program
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, totalCommissions, groupId, links } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {
          program: true,
          links: true,
        },
      });

    const now = new Date();
    const partnerGroupId = groupId || program.defaultGroupId;

    const bounties = await prisma.bounty.findMany({
      where: {
        programId: program.id,
        startsAt: {
          lte: now,
        },
        // If bounty has no groups, it's available to all partners
        // If bounty has groups, only partners in those groups can see it
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
            partnerId: partner.id,
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
            totalCommissions,
          },
        })),
      ),
    );
  },
);
