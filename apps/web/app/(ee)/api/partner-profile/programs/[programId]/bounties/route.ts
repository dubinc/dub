import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { BountyWithPartnerDataSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/[programId]/bounties – get available bounties for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { program, totalCommissions, groupId, links } =
    await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

  const now = new Date();
  const partnerGroupId = groupId || program.defaultGroupId;

  const bounties = await prisma.bounty.findMany({
    where: {
      programId: program.id,
      startsAt: {
        lte: now,
      },
      // Check if the bounty is active
      OR: [
        {
          endsAt: null,
        },
        {
          endsAt: {
            gt: now,
          },
        },
      ],
      // If bounty has no groups (empty BountyGroup entries), it's available to all partners
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

  const linkMetrics = links.reduce(
    (acc, link) => {
      acc.leads += link.leads;
      acc.conversions += link.conversions;
      acc.saleAmount += link.saleAmount;
      return acc;
    },
    { leads: 0, conversions: 0, saleAmount: 0 },
  );

  return NextResponse.json(
    z.array(BountyWithPartnerDataSchema).parse(
      bounties.map((bounty) => {
        const triggerConditions = Array.isArray(
          bounty.workflow?.triggerConditions,
        )
          ? bounty.workflow?.triggerConditions
          : [];

        return {
          ...bounty,
          performanceCondition:
            triggerConditions.length > 0 ? triggerConditions[0] : null,
          partner: {
            leads: linkMetrics.leads,
            conversions: linkMetrics.conversions,
            saleAmount: linkMetrics.saleAmount,
            totalCommissions,
          },
        };
      }),
    ),
  );
});
